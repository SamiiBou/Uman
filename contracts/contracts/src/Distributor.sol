// SPDX–License–Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Distributor is EIP712 {
    IERC20 public immutable token;
    address public signer;
    mapping(bytes32 => bool) public redeemed;

    struct Voucher {
        address to;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    bytes32 private constant VOUCHER_TYPEHASH =
      keccak256("Voucher(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    event Claimed(address indexed to, uint256 amount);

    constructor(address token_, address signer_) EIP712("Distributor","1") {
        token  = IERC20(token_);
        signer = signer_;
    }

    function setSigner(address newSigner) external {
        require(msg.sender == signer, "only signer");
        signer = newSigner;
    }

    function claim(Voucher calldata v, bytes calldata sig) external {
        require(block.timestamp <= v.deadline, "expired");
        require(v.to == msg.sender, "not recipient");

        // Replay protection must be bound to the recipient + nonce, not the full digest.
        // Otherwise a new signature with the same nonce but a different deadline remains claimable.
        bytes32 claimKey = keccak256(abi.encode(v.to, v.nonce));
        require(!redeemed[claimKey], "already used");

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(
                VOUCHER_TYPEHASH,
                v.to, v.amount, v.nonce, v.deadline
            ))
        );
        require(ECDSA.recover(digest, sig) == signer, "bad sig");

        redeemed[claimKey] = true;
        require(token.transfer(v.to, v.amount), "transfer failed");
        emit Claimed(v.to, v.amount);
    }
}
