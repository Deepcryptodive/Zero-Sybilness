// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// import SismoConnect Solidity library
// import "sismo-connect-solidity/SismoLib.sol";
import "forge-std/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Airdrop is ERC721 { // <-- add the SismoConnect inheritance to your contract 
    // use the SismoConnectHelper to easily retrieve the userId of the verified proofs
    // In this example, the userId is the vaultId, an anonymous identifier of a user's vault for a specific app
    // vaultId = hash(userVaultSecret, appId)
    /////////////// UNCOMMENT THIS LINE TO USE SISMO CONNECT ///////////////
    // using SismoConnectHelper for SismoConnectVerifiedResult;

    uint256 public tokenIdIndex;
	mapping(address => bool) public claimed;

    error RegularERC721TransferFromAreNotAllowed();
    error RegularERC721SafeTransferFromAreNotAllowed();
    error AlreadyClaimed();

    constructor(
        string memory name,
        string memory symbol
        // bytes16 appId // the appId of your sismoConnect app (you need to register your sismoConnect app on https://factory.sismo.io)
    ) ERC721(name, symbol) 
    // SismoConnect(appId) 
    {}

    // Simple claim function that mints a token to the address `to`
    // This function is not sybil resistant as far as it is possible for anyone to mint the airdrop multiple times
    // by just changing the address 
    function claim() public {
        if (claimed[msg.sender]) {
			revert AlreadyClaimed();
		}
	
	    uint256 tokenId = tokenIdIndex;
	    tokenIdIndex++;
	    claimed[msg.sender] = true;

        console.log("msg.sender", msg.sender);
	    _mint(msg.sender, tokenId);
    }

    // /**
    //  * @notice Claim a ERC721 on the address `to` thanks to a sismoConnect response containing a valid proof
    //  *         with respect to the auth and message signature requests
    //  * @param response the sismoConnect response from the Data Vault app in bytes
    //  * @param to the address to mint the token to
    //  */
    // function claimWithSismoConnect(bytes memory response, address to) public returns (uint256) {
    //     // the verify function will check that the sismoConnectResponse proof is cryptographically valid
    //     // with respect to the auth and message signature requests
    //     // i.e it checks that the user is the owner of a Sismo Data Vault
    //     // and that the message signature is valid
    //     SismoConnectVerifiedResult memory result = verify({
    //         responseBytes: response,
    //         auth: buildAuth({authType: AuthType.VAULT}),
    //         signature: buildSignature({message: abi.encode(to)})
    //     });

    //     // if the proof is valid, we mint the token to the address `to`
    //     // the tokenId is the anonymized userId of the user that claimed the token
    //     // if the user calls the claimWithSismoConnect function multiple times
    //     // he will only be able to claim one token
    //     uint256 tokenId = result.getUserId(AuthType.VAULT);
    //     _mint(to, tokenId);

    //     return tokenId;
    // }

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