// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 a) external returns (bool);
    function transferFrom(address from, address to, uint256 a) external returns (bool);
    function balanceOf(address a) external view returns (uint256);
}

/// @title ArcDefi — reusable AMM (swap + liquidity) + yield vault module.
/// USDC is the native gas token (msg.value, 18 dec); EURC is an ERC20 (6 dec).
contract ArcDefi {
    IERC20 public eurc;
    address public dfOwner;
    uint256 public resUsdc;
    uint256 public resEurc;
    uint256 public totalLp;
    mapping(address => uint256) public lpOf;
    uint16 public constant FEE_BPS = 30;

    uint256 public earnApyBps = 800;
    struct EPos { uint256 principal; uint256 since; uint256 accrued; }
    mapping(address => EPos) private earnPos;
    uint256 public earnTotal;

    event Swapped(address indexed u, bool usdcToEurc, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed u, uint256 usdc, uint256 eurc, uint256 lp);
    event LiquidityRemoved(address indexed u, uint256 usdc, uint256 eurc, uint256 lp);
    event EarnDeposited(address indexed u, uint256 amount);
    event EarnWithdrawn(address indexed u, uint256 principal, uint256 interest);

    constructor(address _eurc) { eurc = IERC20(_eurc); dfOwner = msg.sender; }

    function _sqrt(uint256 x) private pure returns (uint256 y) { if (x == 0) return 0; uint256 z = (x + 1) / 2; y = x; while (z < y) { y = z; z = (x / z + z) / 2; } }

    function addLiquidity(uint256 eurcAmt) external payable returns (uint256 lp) {
        require(msg.value > 0 && eurcAmt > 0, "zero");
        require(eurc.transferFrom(msg.sender, address(this), eurcAmt), "eurc in");
        if (totalLp == 0) { lp = _sqrt(msg.value * eurcAmt); }
        else { uint256 a = msg.value * totalLp / resUsdc; uint256 b = eurcAmt * totalLp / resEurc; lp = a < b ? a : b; }
        require(lp > 0, "lp 0");
        resUsdc += msg.value; resEurc += eurcAmt; totalLp += lp; lpOf[msg.sender] += lp;
        emit LiquidityAdded(msg.sender, msg.value, eurcAmt, lp);
    }
    function removeLiquidity(uint256 lp) external {
        require(lp > 0 && lpOf[msg.sender] >= lp, "lp");
        uint256 u = lp * resUsdc / totalLp; uint256 e = lp * resEurc / totalLp;
        lpOf[msg.sender] -= lp; totalLp -= lp; resUsdc -= u; resEurc -= e;
        require(eurc.transfer(msg.sender, e), "eurc out");
        (bool ok,) = payable(msg.sender).call{value: u}(""); require(ok, "usdc out");
        emit LiquidityRemoved(msg.sender, u, e, lp);
    }
    function _out(uint256 amountIn, uint256 rIn, uint256 rOut) private pure returns (uint256) {
        uint256 f = amountIn * (10000 - FEE_BPS) / 10000; return f * rOut / (rIn + f);
    }
    function swapUsdcToEurc(uint256 minOut) external payable returns (uint256 outAmt) {
        require(msg.value > 0 && resEurc > 0, "liq");
        outAmt = _out(msg.value, resUsdc, resEurc);
        require(outAmt >= minOut && outAmt < resEurc, "slippage");
        resUsdc += msg.value; resEurc -= outAmt;
        require(eurc.transfer(msg.sender, outAmt), "eurc out");
        emit Swapped(msg.sender, true, msg.value, outAmt);
    }
    function swapEurcToUsdc(uint256 amountIn, uint256 minOut) external returns (uint256 outAmt) {
        require(amountIn > 0 && resUsdc > 0, "liq");
        require(eurc.transferFrom(msg.sender, address(this), amountIn), "eurc in");
        outAmt = _out(amountIn, resEurc, resUsdc);
        require(outAmt >= minOut && outAmt < resUsdc, "slippage");
        resEurc += amountIn; resUsdc -= outAmt;
        (bool ok,) = payable(msg.sender).call{value: outAmt}(""); require(ok, "usdc out");
        emit Swapped(msg.sender, false, amountIn, outAmt);
    }
    function quote(bool usdcToEurc, uint256 amountIn) external view returns (uint256) {
        if (amountIn == 0) return 0;
        return usdcToEurc ? _out(amountIn, resUsdc, resEurc) : _out(amountIn, resEurc, resUsdc);
    }
    function reserves() external view returns (uint256 usdc, uint256 eurcBal, uint256 lp) { return (resUsdc, resEurc, totalLp); }

    function _earnPending(EPos memory p) private view returns (uint256) {
        if (p.principal == 0) return 0;
        return p.principal * earnApyBps * (block.timestamp - p.since) / (10000 * 365 days);
    }
    function earnPending(address u) public view returns (uint256) { EPos memory p = earnPos[u]; return p.accrued + _earnPending(p); }
    function earnPrincipal(address u) external view returns (uint256) { return earnPos[u].principal; }
    function earnBalanceOf(address u) external view returns (uint256) { return earnPos[u].principal + earnPending(u); }
    function earnDeposit() external payable {
        require(msg.value > 0, "0");
        EPos storage p = earnPos[msg.sender];
        p.accrued += _earnPending(p); p.principal += msg.value; p.since = block.timestamp; earnTotal += msg.value;
        emit EarnDeposited(msg.sender, msg.value);
    }
    function earnWithdraw() external {
        EPos storage p = earnPos[msg.sender];
        uint256 principal = p.principal; require(principal > 0, "none");
        uint256 interest = p.accrued + _earnPending(p); uint256 payout = principal + interest;
        require(address(this).balance >= payout, "reserve");
        earnTotal -= principal; p.principal = 0; p.accrued = 0; p.since = block.timestamp;
        (bool ok,) = payable(msg.sender).call{value: payout}(""); require(ok, "pay");
        emit EarnWithdrawn(msg.sender, principal, interest);
    }
    function setEarnApy(uint256 bps) external { require(msg.sender == dfOwner && bps <= 5000, "no"); earnApyBps = bps; }
    function earnFund() external payable { require(msg.sender == dfOwner, "no"); }
    receive() external payable {}
}

contract ArcEquitypay is ArcDefi {
    constructor(address _eurc) ArcDefi(_eurc) {}
    struct Grant { address grantor; address beneficiary; string label; uint256 amount; uint256 cliff; bool claimed; }
    Grant[] public grants;
    mapping(address => uint256[]) private beneMap;
    mapping(address => uint256[]) private grantorMap;
    event Created(uint256 indexed id, address indexed beneficiary, uint256 amount, uint256 cliff);
    event Claimed(uint256 indexed id, uint256 amount);
    function create(address beneficiary, string calldata label, uint256 cliffDays) external payable returns (uint256 id) {
        require(msg.value > 0 && beneficiary != address(0), "bad");
        id = grants.length; grants.push(Grant(msg.sender, beneficiary, label, msg.value, block.timestamp + cliffDays * 1 days, false));
        beneMap[beneficiary].push(id); grantorMap[msg.sender].push(id);
        emit Created(id, beneficiary, msg.value, block.timestamp + cliffDays * 1 days);
    }
    function claim(uint256 id) external {
        Grant storage g = grants[id];
        require(msg.sender == g.beneficiary && !g.claimed, "no");
        require(block.timestamp >= g.cliff, "cliff not reached");
        g.claimed = true;
        (bool ok,) = payable(g.beneficiary).call{value: g.amount}(""); require(ok, "fail");
        emit Claimed(id, g.amount);
    }
    function matured(uint256 id) external view returns (bool) { return block.timestamp >= grants[id].cliff; }
    function get(uint256 id) external view returns (Grant memory) { return grants[id]; }
    function getBene(address u) external view returns (uint256[] memory) { return beneMap[u]; }
    function getGrantor(address u) external view returns (uint256[] memory) { return grantorMap[u]; }
    function total() external view returns (uint256) { return grants.length; }
}
