// Here we export helper types and functions for interacting with the Hybrid AMM Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import HybridAmmIDL from '../target/idl/hybrid_amm.json'
import type { HybridAmm } from '../target/types/hybrid_amm'

// Re-export the generated IDL and type
export { HybridAmm, HybridAmmIDL }

// The programId is imported from the program IDL.
export const HYBRID_AMM_PROGRAM_ID = new PublicKey((HybridAmmIDL as any).address)

// Helper to get the Hybrid AMM Anchor program
export function getHybridAmmProgram(provider: AnchorProvider, address?: PublicKey): Program<HybridAmm> {
  return new Program({ ...(HybridAmmIDL as any), address: address ? address.toBase58() : (HybridAmmIDL as any).address } as HybridAmm, provider)
}

// Helper to get the program ID per cluster
export function getHybridAmmProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // Deployed devnet/testnet program ID
      return new PublicKey('7DonoNgUsMjGj89yCDSZhaN2Cxy3YhfCYx6HoSWqzXyz')
    case 'mainnet-beta':
    default:
      return HYBRID_AMM_PROGRAM_ID
  }
}


