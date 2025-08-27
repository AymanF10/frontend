'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'
import { useHybridAmmProgram } from './hybrid-data-access'
import { HybridDepositForm, HybridInitializeForm, HybridSwapForm, HybridWithdrawForm } from './hybrid-ui'

export default function HybridFeature() {
  const { publicKey } = useWallet()
  const { programId } = useHybridAmmProgram()

  return publicKey ? (
    <div className="space-y-8">
      <AppHero title="Hybrid AMM" subtitle={'Interact with the deployed Hybrid AMM on devnet.'}>
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
      </AppHero>

      <section className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded border dark:border-neutral-800">
          <h3 className="mb-2 font-semibold">Initialize Pool</h3>
          <HybridInitializeForm />
        </div>
        <div className="p-4 rounded border dark:border-neutral-800">
          <h3 className="mb-2 font-semibold">Deposit Liquidity</h3>
          <HybridDepositForm />
        </div>
        <div className="p-4 rounded border dark:border-neutral-800">
          <h3 className="mb-2 font-semibold">Swap</h3>
          <HybridSwapForm />
        </div>
        <div className="p-4 rounded border dark:border-neutral-800">
          <h3 className="mb-2 font-semibold">Withdraw</h3>
          <HybridWithdrawForm />
        </div>
      </section>
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}


