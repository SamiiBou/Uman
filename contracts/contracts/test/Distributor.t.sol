// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Distributor} from "../src/Distributor.sol";
import {UmaniToken} from "../src/UmaniToken.sol";

contract DistributorTest is Test {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    UmaniToken internal token;
    Distributor internal distributor;

    uint256 internal signerPk = 0xA11CE;
    address internal signerAddress;
    address internal recipient = address(0xBEEF);

    function setUp() public {
        signerAddress = vm.addr(signerPk);

        token = new UmaniToken(address(this));
        distributor = new Distributor(address(token), signerAddress);

        token.transfer(address(distributor), 10_000 ether);
    }

    function testClaimTransfersTokens() public {
        Distributor.Voucher memory voucher = Distributor.Voucher({
            to: recipient,
            amount: 614 ether,
            nonce: 1,
            deadline: block.timestamp + 5 minutes
        });

        bytes memory signature = signVoucher(voucher);

        vm.prank(recipient);
        distributor.claim(voucher, signature);

        assertEq(token.balanceOf(recipient), 614 ether);
    }

    function testRejectsReplayForSameNonceWithDifferentDeadline() public {
        Distributor.Voucher memory firstVoucher = Distributor.Voucher({
            to: recipient,
            amount: 614 ether,
            nonce: 42,
            deadline: block.timestamp + 5 minutes
        });

        Distributor.Voucher memory replayVoucher = Distributor.Voucher({
            to: recipient,
            amount: 614 ether,
            nonce: 42,
            deadline: block.timestamp + 10 minutes
        });

        bytes memory firstSignature = signVoucher(firstVoucher);
        bytes memory replaySignature = signVoucher(replayVoucher);

        vm.prank(recipient);
        distributor.claim(firstVoucher, firstSignature);

        vm.expectRevert("already used");
        vm.prank(recipient);
        distributor.claim(replayVoucher, replaySignature);
    }

    function signVoucher(Distributor.Voucher memory voucher) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                VOUCHER_TYPEHASH,
                voucher.to,
                voucher.amount,
                voucher.nonce,
                voucher.deadline
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("Distributor")),
                keccak256(bytes("1")),
                block.chainid,
                address(distributor)
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
