// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract UmaniToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    string private _tokenURI;
    uint256 public constant MAX_SUPPLY = 100_000_000_000 * 10**18; // 100 billion tokens

    constructor(address initialOwner)
        ERC20("Umani", "UMI")
        Ownable(initialOwner)
        ERC20Permit("Umani")
    {
        // Mint 100 billion tokens to the initial owner
        _mint(initialOwner, 100_000_000_000 * 10**18);
    }

    /**
     * @dev Creates `amount` new tokens for `to`, increasing the total supply.
     * Can only be called by the owner, and total supply must not exceed MAX_SUPPLY.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum token supply");
        _mint(to, amount);
    }

    /**
     * @dev Sets the metadata URI for this token (e.g., IPFS link to logo, metadata).
     */
    function setTokenURI(string memory newTokenURI) public onlyOwner {
        _tokenURI = newTokenURI;
    }

    /**
     * @dev Returns the metadata URI for this token.
     */
    function tokenURI() public view returns (string memory) {
        return _tokenURI;
    }
}
