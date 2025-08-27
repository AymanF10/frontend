'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useHybridAmmMutations, deriveAddresses, useHybridAmmProgram, deriveConfigPda, useHybridAmmSetup, useHybridAmmState } from './hybrid-data-access'

export function HybridInitializeForm() {
  const { publicKey } = useWallet()
  const { programId } = useHybridAmmProgram()
  const { initialize } = useHybridAmmMutations()
  const { generateMints, mintBothToWallet } = useHybridAmmSetup()
  const { setState } = useHybridAmmState()
  const [seed, setSeed] = useState<string>('0')
  const [fee, setFee] = useState<string>('30')
  const [mintX, setMintX] = useState<string>('')
  const [mintY, setMintY] = useState<string>('')
  const [derived, setDerived] = useState<{ config?: string; mintLp?: string; vaultX?: string; vaultY?: string }>({})

  async function onSubmit() {
    try {
      if (!publicKey) return
      const seedBn = BigInt(seed)
      const mintXKey = new PublicKey(mintX)
      const mintYKey = new PublicKey(mintY)
      const config = deriveConfigPda(programId, seedBn)
      const { mintLp, vaultX, vaultY } = await deriveAddresses({ programId, config, mintX: mintXKey, mintY: mintYKey, user: publicKey })
      setDerived({ config: config.toBase58(), mintLp: mintLp.toBase58(), vaultX: vaultX.toBase58(), vaultY: vaultY.toBase58() })
      await initialize.mutateAsync({
        seed: seedBn,
        fee: Number(fee),
        authority: publicKey,
        admin: publicKey,
        mintX: mintXKey,
        mintY: mintYKey,
        config,
        mintLp,
        vaultX,
        vaultY,
      })
      setState({ config: config.toBase58(), mintX: mintXKey.toBase58(), mintY: mintYKey.toBase58(), mintLp: mintLp.toBase58() })
    } catch (err) {
      // Error will be surfaced by mutation onError; keep console for extra context
      console.error('initialize submit error', err)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            const res = await generateMints.mutateAsync(6)
            setMintX(res.mintX.toBase58())
            setMintY(res.mintY.toBase58())
          }}
          disabled={generateMints.isPending}
        >
          {generateMints.isPending ? 'Generating…' : 'Generate Mint X/Y'}
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (!mintX || !mintY) return
            await mintBothToWallet.mutateAsync({ mintX: new PublicKey(mintX), mintY: new PublicKey(mintY), amountX: BigInt(1_000_000_000), amountY: BigInt(1_000_000_000) })
          }}
          disabled={mintBothToWallet.isPending}
        >
          {mintBothToWallet.isPending ? 'Minting…' : 'Mint Tokens To Wallet'}
        </Button>
      </div>
      <Input placeholder="Seed (u64)" value={seed} onChange={(e) => setSeed(e.target.value)} />
      <Input placeholder="Fee (u16)" value={fee} onChange={(e) => setFee(e.target.value)} />
      <Input placeholder="Mint X" value={mintX} onChange={(e) => setMintX(e.target.value)} />
      <Input placeholder="Mint Y" value={mintY} onChange={(e) => setMintY(e.target.value)} />
      <Button onClick={onSubmit} disabled={initialize.isPending}>{initialize.isPending ? 'Initializing…' : 'Initialize'}</Button>
      <div className="text-xs text-neutral-500 mt-2 break-all">
        <div>Program ID: {programId.toBase58()}</div>
        {derived.config && (
          <div className="mt-1">
            <div>Derived Config: {derived.config}</div>
            <div>Derived Mint LP: {derived.mintLp}</div>
            <div>Vault X: {derived.vaultX}</div>
            <div>Vault Y: {derived.vaultY}</div>
          </div>
        )}
        {initialize.isError && (
          <div className="mt-2 text-red-500">{(initialize.error instanceof Error ? initialize.error.message : 'Initialize failed. See console for details.')}</div>
        )}
      </div>
    </div>
  )
}

export function HybridDepositForm() {
  const { publicKey } = useWallet()
  const { programId } = useHybridAmmProgram()
  const { deposit } = useHybridAmmMutations()
  const { state } = useHybridAmmState()
  const [configStr, setConfigStr] = useState<string>('')
  const [mintX, setMintX] = useState<string>('')
  const [mintY, setMintY] = useState<string>('')
  useEffect(() => {
    if (state.config && !configStr) setConfigStr(state.config)
    if (state.mintX && !mintX) setMintX(state.mintX)
    if (state.mintY && !mintY) setMintY(state.mintY)
  }, [state, configStr, mintX, mintY])
  const [amount, setAmount] = useState<string>('0')
  const [maxX, setMaxX] = useState<string>('0')
  const [maxY, setMaxY] = useState<string>('0')

  async function onSubmit() {
    if (!publicKey) return
    const config = new PublicKey(configStr)
    const mintXKey = new PublicKey(mintX)
    const mintYKey = new PublicKey(mintY)
    const { mintLp, vaultX, vaultY, userX, userY, userLp } = await deriveAddresses({ programId, config, mintX: mintXKey, mintY: mintYKey, user: publicKey })
    await deposit.mutateAsync({
      user: publicKey,
      mintX: mintXKey,
      mintY: mintYKey,
      config,
      mintLp,
      vaultX,
      vaultY,
      userX,
      userY,
      userLp,
      amount: BigInt(amount),
      maxX: BigInt(maxX),
      maxY: BigInt(maxY),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Config" value={configStr} onChange={(e) => setConfigStr(e.target.value)} />
      <Input placeholder="Mint X" value={mintX} onChange={(e) => setMintX(e.target.value)} />
      <Input placeholder="Mint Y" value={mintY} onChange={(e) => setMintY(e.target.value)} />
      <Input placeholder="Amount (LP)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input placeholder="Max X" value={maxX} onChange={(e) => setMaxX(e.target.value)} />
      <Input placeholder="Max Y" value={maxY} onChange={(e) => setMaxY(e.target.value)} />
      <Button onClick={onSubmit} disabled={deposit.isPending}>{deposit.isPending ? 'Depositing…' : 'Deposit'}</Button>
    </div>
  )
}

export function HybridSwapForm() {
  const { publicKey } = useWallet()
  const { programId } = useHybridAmmProgram()
  const { swap } = useHybridAmmMutations()
  const { state } = useHybridAmmState()
  const [configStr, setConfigStr] = useState<string>('')
  const [mintX, setMintX] = useState<string>('')
  const [mintY, setMintY] = useState<string>('')
  useEffect(() => {
    if (state.config && !configStr) setConfigStr(state.config)
    if (state.mintX && !mintX) setMintX(state.mintX)
    if (state.mintY && !mintY) setMintY(state.mintY)
  }, [state, configStr, mintX, mintY])
  const [isX, setIsX] = useState<boolean>(true)
  const [amount, setAmount] = useState<string>('0')
  const [min, setMin] = useState<string>('0')

  async function onSubmit() {
    if (!publicKey) return
    const config = new PublicKey(configStr)
    const mintXKey = new PublicKey(mintX)
    const mintYKey = new PublicKey(mintY)
    const { mintLp, vaultX, vaultY, userX, userY } = await deriveAddresses({ programId, config, mintX: mintXKey, mintY: mintYKey, user: publicKey })
    await swap.mutateAsync({
      user: publicKey,
      mintX: mintXKey,
      mintY: mintYKey,
      config,
      mintLp,
      vaultX,
      vaultY,
      userX,
      userY,
      isX,
      amount: BigInt(amount),
      min: BigInt(min),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Config" value={configStr} onChange={(e) => setConfigStr(e.target.value)} />
      <Input placeholder="Mint X" value={mintX} onChange={(e) => setMintX(e.target.value)} />
      <Input placeholder="Mint Y" value={mintY} onChange={(e) => setMintY(e.target.value)} />
      <div className="flex gap-2 items-center">
        <label className="text-sm">Swap direction:</label>
        <Button variant={isX ? 'default' : 'outline'} onClick={() => setIsX(true)}>X → Y</Button>
        <Button variant={!isX ? 'default' : 'outline'} onClick={() => setIsX(false)}>Y → X</Button>
      </div>
      <Input placeholder="Amount In" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input placeholder="Min Out" value={min} onChange={(e) => setMin(e.target.value)} />
      <Button onClick={onSubmit} disabled={swap.isPending}>{swap.isPending ? 'Swapping…' : 'Swap'}</Button>
    </div>
  )
}

export function HybridWithdrawForm() {
  const { publicKey } = useWallet()
  const { programId } = useHybridAmmProgram()
  const { withdraw } = useHybridAmmMutations()
  const { state } = useHybridAmmState()
  const [configStr, setConfigStr] = useState<string>('')
  const [mintX, setMintX] = useState<string>('')
  const [mintY, setMintY] = useState<string>('')
  useEffect(() => {
    if (state.config && !configStr) setConfigStr(state.config)
    if (state.mintX && !mintX) setMintX(state.mintX)
    if (state.mintY && !mintY) setMintY(state.mintY)
  }, [state, configStr, mintX, mintY])
  const [amount, setAmount] = useState<string>('0')
  const [minX, setMinX] = useState<string>('0')
  const [minY, setMinY] = useState<string>('0')

  async function onSubmit() {
    if (!publicKey) return
    const config = new PublicKey(configStr)
    const mintXKey = new PublicKey(mintX)
    const mintYKey = new PublicKey(mintY)
    const { mintLp, vaultX, vaultY, userX, userY, userLp } = await deriveAddresses({ programId, config, mintX: mintXKey, mintY: mintYKey, user: publicKey })
    await withdraw.mutateAsync({
      user: publicKey,
      mintX: mintXKey,
      mintY: mintYKey,
      config,
      mintLp,
      vaultX,
      vaultY,
      userX,
      userY,
      userLp,
      amount: BigInt(amount),
      minX: BigInt(minX),
      minY: BigInt(minY),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Config" value={configStr} onChange={(e) => setConfigStr(e.target.value)} />
      <Input placeholder="Mint X" value={mintX} onChange={(e) => setMintX(e.target.value)} />
      <Input placeholder="Mint Y" value={mintY} onChange={(e) => setMintY(e.target.value)} />
      <Input placeholder="LP Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input placeholder="Min X" value={minX} onChange={(e) => setMinX(e.target.value)} />
      <Input placeholder="Min Y" value={minY} onChange={(e) => setMinY(e.target.value)} />
      <Button onClick={onSubmit} disabled={withdraw.isPending}>{withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}</Button>
    </div>
  )
}


