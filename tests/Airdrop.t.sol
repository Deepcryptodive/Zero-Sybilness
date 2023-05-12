// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {Airdrop} from "../src/Airdrop.sol";
import {BaseTest} from "./base/BaseTest.t.sol";

contract AirdropTest is BaseTest {
  Airdrop public airdrop;

  function setUp() public {
    airdrop = new Airdrop("My airdrop contract", "AIR");
  }

  function test_claimWithSismo() public {
    // Data Vault ownership
    // signature of address 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    bytes memory response = hex"0000000000000000000000000000000000000000000000000000000000000020f4977993e52606cfd67b7a1cde71706900000000000000000000000000000000b8e2054f8a912367e38a22ce773328ff000000000000000000000000000000007369736d6f2d636f6e6e6563742d76310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a068796472612d73322e310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000004a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101b42aaebc220a0702a5ee7e7ccf1a58f85a7b0bfc7e9ebe6de3fc5ab562a23e00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c02054217a92f7b914a74f4a66158851d6f45e925faae9df8dae173cb2daa8cea619574d6ac9f73f11e40f7b51950134239d8a05dfdec3b7ab4d2f4eeb5a597b6a1c32f9f5c68d5e11453af85fd678f96fe3f8d0777c7a06e94d83916f30952958165a50e083f17922416800d0dcdb804959cca97b2e9584b77ba187ad97d330ed0ff74ef929fb27f2bb3d40199a0e66529258c82e80d80ddb1f60f1cd042b777d0fec28b17b35488be3b28a5502b0ff9846d74a21835b0534f3fe488fb5f7758e22d5678083df60fe8b7094825ea9203e1ef5bbef5039e898ac704e298accbaaa1ba6755c41f96b0ab2e325d26ed78289d1ad293c9036e2923980c55f04b05b0a00000000000000000000000000000000000000000000000000000000000000001c22bb924d4df7679181b00cc5891585ff0b9efac15f0f66d5d498ea4804fb712ab71fb864979b71106135acfa84afc1d756cda74f8f258896f896b4864f025630423b4c502f1cd4179a425723bf1e15c843733af2ecdee9aef6a0451ef2db7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001b42aaebc220a0702a5ee7e7ccf1a58f85a7b0bfc7e9ebe6de3fc5ab562a23e02c02b0c8903e5f139b466d5bc5ceda4a647c4c72486e6d61de22fc3805abdd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    // call the airdrop contract with this address as the msg.sender to have a valid signature
    vm.startPrank(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    airdrop.claimWithSismo(response);

    // test that if you call the contract a second time, it reverts
    // since the user has already claimed the token
    vm.expectRevert("ERC721: token already minted");
    airdrop.claimWithSismo(response);
  }
}
