import {
  Chain,
  PublicClient,
  WalletClient,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { abi as AirdropABI } from "../../../abi/Airdrop.json";
import { privateKeyToAccount } from "viem/accounts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const mumbaiFork = {
  id: 5151110,
  name: "Fork Mumbai - Sismo",
  network: "forkMumbaiSismo",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
} as const satisfies Chain;

export const getPublicClient = (userChain: Chain): PublicClient => {
  return createPublicClient({
    chain: userChain,
    transport: http(),
  });
};

// The private key of the second account of the local anvil network
// This account is used for the app to allow the user to have fake tokens to call the contract
export const account = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);

export const switchNetwork = async (userChain: Chain) => {
  if (typeof window === "undefined") return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${userChain.id.toString(16)}` }],
    });
  } catch (error: any) {
    // This error code means that the chain we want has not been added to MetaMask
    // In this case we ask the user to add it to their MetaMask
    if (error.code === 4902) {
      try {
        // add mumbai fork chain to metamask
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${userChain.id.toString(16)}`,
              chainName: userChain.name,
              rpcUrls: userChain.rpcUrls.default.http,
              nativeCurrency: {
                name: userChain.nativeCurrency.name,
                symbol: userChain.nativeCurrency.symbol,
                decimals: userChain.nativeCurrency.decimals,
              },
            },
          ],
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log(error);
    }
  }
};

export const requestAccounts = async (): Promise<`0x${string}`> => {
  await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const permissions = await window.ethereum.request({
    method: "wallet_requestPermissions",
    params: [
      {
        eth_accounts: {},
      },
    ],
  });
  const address = permissions[0].caveats[0].value[0];

  // give user fake fork tokens
  const walletClient = createWalletClient({
    chain: mumbaiFork,
    transport: http(),
    account,
  });
  await walletClient.sendTransaction({
    to: address,
    value: parseEther("5"),
  });

  return address;
};

export const callContract = async ({
  contractAddress,
  responseBytes,
  userChain,
  account,
  publicClient,
  walletClient,
}: {
  contractAddress: string;
  responseBytes: string;
  userChain: Chain;
  account: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
}): Promise<string> => {
  const txArgs = {
    address: contractAddress as `0x${string}`,
    abi: AirdropABI,
    functionName: "claimWithSismoConnect", // call the claimWithSismoConnect function
    args: [responseBytes],
    account: account,
    chain: userChain,
  };

  // simulate the call to the contract to get the error if the call reverts
  await publicClient.simulateContract(txArgs);
  // if the simulation call does not revert, send the tx to the contract
  const txHash = await walletClient.writeContract(txArgs);
  // wait for the tx to be mined
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // the tokenId of the NFT minted is the 4th topic of the event emitted by the contract
  const tokenId = (receipt as { logs: { topics: string[] }[] }).logs[0].topics[3];
  return tokenId;
};

export function handleClaimErrors(e: any): any {
  console.log("error", { ...(e as object) });
  console.log("e.shortMessage", (e as { shortMessage: string }).shortMessage);
  return (e as { shortMessage: string }).shortMessage === 'The contract function "claim" reverted.'
    ? "Airdrop already claimed!"
    : (e as { shortMessage: string }).shortMessage;
}

export function handleVerifyErrors(e: any): any {
  // else if the tx is invalid, we show an error message
  // it is either because the proof is invalid or because the user already claimed the airdrop
  console.log("error", { ...(e as object) });
  console.log("e.shortMessage", (e as { shortMessage: string }).shortMessage);
  return (e as { shortMessage: string }).shortMessage ===
    'The contract function "claimWithSismoConnect" reverted with the following reason:\nERC721: token already minted'
    ? "Airdrop already claimed!"
    : (e as { shortMessage: string }).shortMessage;
}