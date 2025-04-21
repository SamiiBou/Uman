// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SocialVerificationRegistry.sol";

contract DeploySocialVerificationRegistry is Script {
    function run() external {
        vm.startBroadcast();

        SocialVerificationRegistry registry = new SocialVerificationRegistry();

        console.log("SocialVerificationRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
