import router from "next/router";
import { useEffect, useState } from "react";
import {
  switchNetwork,
  mumbaiFork,
  requestAccounts,
  getPublicClient,
  handleVerifyErrors,
  callContract,
  signMessage,
} from "@/utils";
import { transactions } from "../../../broadcast/Airdrop.s.sol/5151111/run-latest.json";
import { createWalletClient, http, custom, WalletClient, PublicClient } from "viem";
import BackButton from "../components/BackButton";
import {
  SismoConnectButton, // the Sismo Connect React button displayed
  SismoConnectClientConfig, // the client config with your appId
  AuthType, // the authType enum, we will choose 'VAULT' in this tutorial
} from "@sismo-core/sismo-connect-react";
import { devGroups } from "../config";

export enum APP_STATES {
  init,
  receivedProof,
  claimingNFT,
}

// The application calls contracts on Mumbai testnet
const userChain = mumbaiFork;
const contractAddress = transactions[0].contractAddress;

// you can create a new Sismo Connect app at https://factory.sismo.io
// The SismoConnectClientConfig is a configuration needed to connect to Sismo Connect and requests data from your users.
// You can find more information about the configuration here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react

export const sismoConnectConfig: SismoConnectClientConfig = {
  appId: "0x6aa6b65b0f51e64729bc06022e76127b", //own appID
  devMode: {
    enabled: false,
  },
};

export default function ClaimAirdrop() {
  const GITCOIN_PASSPORT_HOLDERS_GROUP_ID = "0x1cde61966decb8600dfd0749bd371f12";
  const [appState, setAppState] = useState<APP_STATES>(APP_STATES.init);
  const [responseBytes, setResponseBytes] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [tokenId, setTokenId] = useState<{ id: string }>();
  const [account, setAccount] = useState<`0x${string}`>(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  );
  const [isAirdropAddressKnown, setIsAirdropAddressKnown] = useState<boolean>(false);
  const [walletClient, setWalletClient] = useState<WalletClient>(
    createWalletClient({
      chain: userChain,
      transport: http(),
    }) as WalletClient
  );
  const publicClient: PublicClient = getPublicClient(userChain);

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

  async function connectWallet() {
    router.push("/claim-airdrop");
    const address = await requestAccounts();
    localStorage.setItem("airdropAddress", address);
    setAccount(address);
    setIsAirdropAddressKnown(true);
  }

  function setResponse(responseBytes: string) {
    setResponseBytes(responseBytes);
    if (appState !== 2) {
      setAppState(APP_STATES.receivedProof);
    }
  }

  // This function is called when the user is redirected from the Sismo Vault to the Sismo Connect app
  // It is called with the responseBytes returned by the Sismo Vault
  // The responseBytes is a string that contains plenty of information about the user proofs and additional parameters that should hold with respect to the proofs
  // You can learn more about the responseBytes format here: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-client#getresponsebytes
  async function claimWithSismo(responseBytes: string) {
    setAppState(APP_STATES.claimingNFT);
    // switch the network
    await switchNetwork(userChain);
    try {
      const tokenId = await callContract({
        contractAddress,
        responseBytes,
        userChain,
        account,
        publicClient,
        walletClient,
      });
      // If the proof is valid, we update the user react state to show the tokenId
      setTokenId({ id: tokenId });
    } catch (e) {
      setError(handleVerifyErrors(e));
    } finally {
      setAppState(APP_STATES.init);
      localStorage.removeItem("airdropAddress");
    }
  }

  return (
    <>
      <BackButton />
      <div className="container">
        {!tokenId && (
          <>
            <h1 style={{ marginBottom: 10 }}>Claim an airdrop</h1>
            {!isAirdropAddressKnown && (
              <p style={{ marginBottom: 40 }}>
                Select on which address you want to receive the airdrop and sign it with Sismo
                Connect
              </p>
            )}

            {isAirdropAddressKnown ? (
              <p style={{ marginBottom: 40 }}>You will receive the airdrop on {account}</p>
            ) : (
              !error && (
                <button className="connect-wallet-button" onClick={() => connectWallet()}>
                  Connect Wallet
                </button>
              )
            )}

            {
              // This is the Sismo Connect button that will be used to create the requests and redirect the user to the Sismo Vault app to generate the proofs from his data
              // The different props are:
              // - config: the Sismo Connect client config that contains the Sismo Connect appId
              // - auths: the auth requests that will be used to generate the proofs, here we only use the Vault auth request
              // - signature: the signature request that will be used to sign an arbitrary message that will be checked onchain, here it is used to sign the airdrop address
              // - onResponseBytes: the callback that will be called when the user is redirected back from the his Sismo Vault to the Sismo Connect App with the Sismo Connect response as bytes
              // - verifying: a boolean that indicates if the Sismo Connect button is in the verifying state
              // - callbackPath: the path to which the user will be redirected back from the Sismo Vault to the Sismo Connect App
              // You can see more information about the Sismo Connect button in the Sismo Connect documentation: https://docs.sismo.io/build-with-sismo-connect/technical-documentation/sismo-connect-react
            }
            {!error &&
              isAirdropAddressKnown &&
              appState != APP_STATES.receivedProof &&
              appState != APP_STATES.claimingNFT && (
                <SismoConnectButton
                  // the client config created
                  config={sismoConnectConfig}
                  // the auth request we want to make
                  // here we want the proof of a Sismo Vault ownership from our users
                  auths={[{ authType: AuthType.VAULT }]}
                  // [TODO] ADD IN LATER: request a proof of group membership from your users  
                  // They should hold a Gitcoin Passport
                  //claims={[{ groupId: GITCOIN_PASSPORT_HOLDERS_GROUP_ID }]} // <-- pass the groupId

                  // we ask the user to sign a message
                  // it will be used onchain to prevent front running
                  signature={{ message: signMessage(account) }}
                  // onResponseBytes calls a 'setResponse' function with the responseBytes returned by the Sismo Vault
                  onResponseBytes={(responseBytes: string) => setResponse(responseBytes)}
                  // [TODO] To change later into: 
                  //   onResponseBytes={(responseBytes: string) => verify(responseBytes)}
                  // (because it's more than a simple auth)
                  // Some text to display on the button
                  text={"Claim with Zero Sybilness (powered by Sismo)"}
                />
              )}

            {/** Simple button to call the smart contract with the response as bytes */}
            {appState == APP_STATES.receivedProof && (
              <button
                className="connect-wallet-button"
                onClick={async () => {
                  await claimWithSismo(responseBytes);
                }}
                value="Claim Airdrop"
              >
                {" "}
                Claim Reward{" "}
              </button>
            )}
            {appState == APP_STATES.claimingNFT && (
              <p style={{ marginBottom: 40 }}>Claiming Reward...</p>
            )}
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
                <h2>Reward Claimed</h2>
                <b>NFT tokenId: {tokenId?.id}</b>
                <p>Receiving Address: {account}</p>
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
