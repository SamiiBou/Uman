
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/UmaniToken.sol";

contract DeployUmaniToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        UmaniToken UmaniToken = new UmaniToken(deployerAddress);

        // Set the metadata URI after deployment
        UmaniToken.setTokenURI("ipfs://bafkreidgqonfwdicpbe2rxfkejumxo33s6wl63bq6qigjdgc4xlvctcsfi");

        vm.stopBroadcast();

        console.log("UmaniToken deployed at:", address(UmaniToken));
    }
}
