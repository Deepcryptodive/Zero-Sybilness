import { useEffect, useState } from "react";
import { abi as AirdropMumbaiABI } from "../../../../abi/AirdropMumbai.json";
import {
  encodeAbiParameters,
  createWalletClient,
  http,
  custom,
  WalletClient,
  createPublicClient,
} from "viem";
import { polygonMumbai } from "viem/chains";
import BackButton from "../../components/BackButton";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// The application calls contracts on Mumbai testnet
const userChain = polygonMumbai;

/////// CODE SNIPPET 1: Sismo Connect Client Configuration ///////
//
// with your Sismo Connect app ID and enable dev mode.
// you can create a new Sismo Connect app at https://factory.sismo.io
// The SismoConnectClientConfig is a configuration needed to connect to Sismo Connect and requests data from your users.
// You can find more information about the configuration here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react
//
/////// UNCOMMENT THE LINES BELOW ///////////////////////////////

// import {
//   SismoConnectButton,
//   SismoConnectClientConfig,
//   SismoConnectResponse,
//   AuthType,
// } from "@sismo-core/sismo-connect-react";

// export const sismoConnectConfig: SismoConnectClientConfig = {
//   appId: "0xf4977993e52606cfd67b7a1cde717069",
//   devMode: {
//     enabled: true,
//   },
// };

//////////////////////////////////////////////////////////////////

export default function ClaimAirdrop() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const [tokenId, setTokenId] = useState<{ id: string }>();
  const [account, setAccount] = useState<`0x${string}`>(
    "0x0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );
  const [isAirdropAddressKnown, setIsAirdropAddressKnown] = useState<boolean>(false);
  const [walletClient, setWalletClient] = useState<WalletClient>(
    createWalletClient({
      chain: userChain,
      transport: http(),
    }) as WalletClient
  );

  // setup the public and wallet client to interact with the contract deployed on Mumbai
  // the public client is used to read data from the contract or the chain
  // the wallet client is used to send transactions to the contract
  const publicClient = createPublicClient({
    chain: userChain,
    transport: http(),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setWalletClient(
      createWalletClient({
        chain: userChain,
        transport: custom(window.ethereum, {
          key: "windowProvider",
        }),
      }) as WalletClient
    );

    setIsAirdropAddressKnown(localStorage.getItem("airdropAddress") ? true : false);
    if (isAirdropAddressKnown) {
      setAccount(localStorage.getItem("airdropAddress") as `0x${string}`);
    }
  }, [isAirdropAddressKnown]);

  async function connectWallet(): Promise<`0x${string}`> {
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
    localStorage.setItem("airdropAddress", address);
    setAccount(address);
    setIsAirdropAddressKnown(true);
    return address;
  }

  const switchNetwork = async () => {
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

  function handleClaimErrors(e: any) {
    // else if the tx is invalid, we show an error message
    // it is either because the proof is invalid or because the user already claimed the airdrop
    console.log("error", { ...(e as object) });
    console.log("e.shortMessage", (e as { shortMessage: string }).shortMessage);
    (e as { shortMessage: string }).shortMessage === 'The contract function "claim" reverted.'
      ? setError("Airdrop already claimed!")
      : setError((e as { shortMessage: string }).shortMessage);
  }

  function handleVerifyErrors(e: any) {
    // else if the tx is invalid, we show an error message
    // it is either because the proof is invalid or because the user already claimed the airdrop
    console.log("error", { ...(e as object) });
    console.log("e.shortMessage", (e as { shortMessage: string }).shortMessage);
    (e as { shortMessage: string }).shortMessage ===
    'The contract function "claimWithSismoConnect" reverted with the following reason:\nERC721: token already minted'
      ? setError("Airdrop already claimed!")
      : setError((e as { shortMessage: string }).shortMessage);
  }

  async function claim() {
    // update the react state to show the loading state
    setVerifying(true);
    // switch the network
    await switchNetwork();

    // contract address of the simple Airdrop contract on Mumbai
    const contractAddress = "0x5B130E43a2417ea4Ed46d6A4eCb0522F7cCe86ab";

    try {
      const txArgs = {
        address: contractAddress as any as never,
        abi: AirdropMumbaiABI as any as never,
        functionName: "claim" as any as never,
        args: [] as any as never,
        account: account as any as never,
        chain: userChain as any as never,
        value: 0 as any as never,
      };
      // simulate the call to the contract to get the error if the call reverts
      await publicClient.simulateContract(txArgs);
      // if the simulation call does not revert, send the tx to the contract
      const txHash = await walletClient.writeContract(txArgs);

      // wait for the tx to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // the tokenId of the NFT minted is the 4th topic of the event emitted by the contract
      const tokenId = (receipt as { logs: { topics: string[] }[] }).logs[0].topics[3];

      // update the user react state to show the tokenId of the NFT minted
      setTokenId({ id: tokenId });
    } catch (e) {
      handleClaimErrors(e);
    } finally {
      setVerifying(false);
      localStorage.removeItem("airdropAddress");
    }
  }

  /////// CODE SNIPPET 3: The `verify` function ///////
  //
  // This function is called when the user is redirected from the Sismo Vault to the Sismo Connect app
  // It is called with the responseBytes returned by the Sismo Vault
  // The responseBytes is a string that contains plenty of information about the user proofs and additional parameters that should hold with respect to the proofs
  // You can learn more about the responseBytes format here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-client#getresponsebytes
  //
  ////// UNCOMMENT THE LINES BELOW ///////////////////

  // async function verify(responseBytes: string) {
  //   // update the react state to show the loading state
  //   setVerifying(true);
  //   // switch the network
  //   await switchNetwork();

  //   // contract address of the Sismo Connect Airdrop contract on Mumbai
  //   const contractAddress = ""; // <-- replace with your deployed contract address

  //   try {
  //     const txArgs = {
  //       address: contractAddress as `0x${string}`,
  //       abi: AirdropABI,
  //       functionName: "claimWithSismoConnect", // call the claimWithSismoConnect function
  //       args: [responseBytes, account],
  //       account: account,
  //       chain: userChain,
  //     };

  //     // simulate the call to the contract to get the error if the call reverts
  //     await publicClient.simulateContract(txArgs);
  //     // if the simulation call does not revert, send the tx to the contract
  //     const txHash = await walletClient.writeContract(txArgs);
  //     // wait for the tx to be mined
  //     const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  //     // the tokenId of the NFT minted is the 4th topic of the event emitted by the contract
  //     const tokenId = (receipt as { logs: { topics: string[] }[] }).logs[0].topics[3];
  //     // If the proof is valid, we update the user react state to show the tokenId
  //     setTokenId({ id: tokenId });
  //   } catch (e) {
  //     handleVerifyErrors(e);
  //   } finally {
  //     setVerifying(false);
  //     localStorage.removeItem("airdropAddress");
  //   }
  // }

  /////////////////////////////////////////////////

  return (
    <>
      <BackButton />
      <div className="container">
        {!tokenId && (
          <>
            <h1 style={{ marginBottom: 10 }}>Claim an airdrop</h1>
            {!isAirdropAddressKnown && (
              // <p style={{ marginBottom: 40 }}>
              //   Select on which address you want to receive the airdrop and sign it with Sismo
              //   Connect
              // </p>
              <p style={{ marginBottom: 40 }}>
                Select on which address you want to receive the airdrop by connecting your wallet
              </p>
            )}

            {isAirdropAddressKnown ? (
              <p style={{ marginBottom: 40 }}>You are connected with the address {account}</p>
            ) : (
              !error && (
                <button className="connect-wallet-button" onClick={() => connectWallet()}>
                  Connect Wallet
                </button>
              )
            )}

            {
              /////// CODE SNIPPET 2: Sismo Connect React Button ///////
              //
              // This is the Sismo Connect button that will be used to create the requests and redirect the user to the Sismo Vault app to generate the proofs from his data
              // The different props are:
              // - config: the Sismo Connect client config that contains the Sismo Connect appId
              // - auths: the auth requests that will be used to generate the proofs, here we only use the Vault auth request
              // - signature: the signature request that will be used to sign an arbitrary message that will be checked onchain, here it is used to sign the airdrop address
              // - onResponseBytes: the callback that will be called when the user is redirected back from the his Sismo Vault to the Sismo Connect App with the Sismo Connect response as bytes
              // - verifying: a boolean that indicates if the Sismo Connect button is in the verifying state
              // - callbackPath: the path to which the user will be redirected back from the Sismo Vault to the Sismo Connect App
              // You can see more information about the Sismo Connect button in the Sismo Connect documentation: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react
              //
              /////// UNCOMMENT THE CODE BELOW TO USE THE SISMO CONNECT BUTTON ///////
            }
            {/* {!error && isAirdropAddressKnown && (
              <SismoConnectButton
                // the client config created
                config={sismoConnectConfig}
                // the auth request we want to make
                // here we want the proof of a Sismo Vault ownership from our users
                auths={[{ authType: AuthType.VAULT }]}
                // we use the AbiCoder to encode the data we want to sign
                // by encoding it we will be able to decode it on chain
                signature={{
                  message: encodeAbiParameters(
                    [{ type: "address", name: "airdropAddress" }],
                    [(account as `0x${string}`)]
                  ),
                }}
                // onResponseBytes calls a 'verify' function where the contract call logic
                // is implemented
                onResponseBytes={(responseBytes: string) => verify(responseBytes)}
                // a simple state to know if the button is in verifying state
                // i.e calling the smart contract
                verifying={verifying}
                // the callback path where you want to redirect your users from the Sismo Vault app
                // here we choose this same page
                callbackPath={"/level-0/claim-airdrop"}
              />
            )} */}

            {!error && isAirdropAddressKnown && !verifying && (
              <button className="connect-wallet-button" onClick={() => claim()}>
                Claim Airdrop
              </button>
            )}

            {verifying && <p style={{ marginBottom: 40 }}>Verifying...</p>}
          </>
        )}

        {tokenId && (
          <>
            <h1>Airdrop claimed!</h1>
            <p style={{ marginBottom: 20 }}>
              The user has chosen an address to receive the airdrop
            </p>
            <div className="profile-container">
              <div>
                <h2>NFT Claimed</h2>
                <b>tokenId: {tokenId?.id}</b>
                <p>Address used: {account}</p>
              </div>
            </div>
          </>
        )}

        {error && (
          <>
            <h2>{error}</h2>
          </>
        )}
      </div>
    </>
  );
}
