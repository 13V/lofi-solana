// Anchor default migration stub.
//
// `anchor deploy` / `anchor migrate` invoke this after deploying the program.
// Add any one-time on-chain bootstrapping here (e.g. calling `init_config`).
//
// TODO(audit): wire up `init_config` with the real oracle authority pubkey for
// the target cluster before running this against devnet/mainnet.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Example bootstrap (left commented; uncomment + set the oracle authority):
  //
  // const program = anchor.workspace.LofiRewards as anchor.Program;
  // const ORACLE_AUTHORITY = new anchor.web3.PublicKey("<oracle pubkey>");
  // const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
  //   [Buffer.from("config")],
  //   program.programId
  // );
  // await program.methods
  //   .initConfig(ORACLE_AUTHORITY)
  //   .accounts({
  //     admin: provider.wallet.publicKey,
  //     config: configPda,
  //     systemProgram: anchor.web3.SystemProgram.programId,
  //   })
  //   .rpc();
};
