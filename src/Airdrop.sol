// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "sismo-connect-solidity/SismoLib.sol"; // <--- add a Sismo Connect import

/* 
 * @title Airdrop
 * @dev Simple Airdrop contract that mints a token to the msg.sender
 * This contract is used for tutorial purposes only
 */
contract Airdrop is ERC721 { // <--- add a Sismo Connect inheritance

    uint256 public tokenIdIndex;
	mapping(address => bool) public claimed;

    error RegularERC721TransferFromAreNotAllowed();
    error RegularERC721SafeTransferFromAreNotAllowed();
    error AlreadyClaimed();

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) 
    {}

    // Simple claim function that mints a token to the msg.sender
    function claim() public {
        if (claimed[msg.sender]) {
			revert AlreadyClaimed();
		}
	    uint256 tokenId = tokenIdIndex;
	    tokenIdIndex++;
	    claimed[msg.sender] = true;
	    _mint(msg.sender, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        revert RegularERC721TransferFromAreNotAllowed();
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        revert RegularERC721SafeTransferFromAreNotAllowed();
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data)
        public
        virtual
        override
    {
        revert RegularERC721SafeTransferFromAreNotAllowed();
    }
}