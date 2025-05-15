"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { TOKEN_IDS } from "@/lib/contract"

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (to: string, id: number, amount: number) => Promise<boolean>
  balance: string
  loroRojoBalance: string
  loroMoradoBalance: string
  isLoading: boolean
}

export function TransferModal({
  isOpen,
  onClose,
  onTransfer,
  balance,
  loroRojoBalance,
  loroMoradoBalance,
  isLoading,
}: TransferModalProps) {
  const [recipient, setRecipient] = useState("")
  const [tokenType, setTokenType] = useState("0")
  const [amount, setAmount] = useState("1")

  const handleTransfer = async () => {
    if (!recipient || !recipient.startsWith("0x") || recipient.length !== 42) {
      toast({
        title: "Dirección inválida",
        description: "Por favor ingresa una dirección de wallet válida",
        variant: "destructive",
      })
      return
    }

    const tokenId = Number.parseInt(tokenType)
    const amountNum = Number.parseInt(amount)

    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Por favor ingresa una cantidad válida",
        variant: "destructive",
      })
      return
    }

    // Verificar balance según el tipo de token
    let currentBalance = "0"
    if (tokenId === TOKEN_IDS.PIROT) {
      currentBalance = balance
    } else if (tokenId === TOKEN_IDS.LORO_ROJO) {
      currentBalance = loroRojoBalance
    } else if (tokenId === TOKEN_IDS.LORO_MORADO) {
      currentBalance = loroMoradoBalance
    }

    if (Number.parseInt(currentBalance) < amountNum) {
      toast({
        title: "Balance insuficiente",
        description: "No tienes suficientes tokens para transferir",
        variant: "destructive",
      })
      return
    }

    const success = await onTransfer(recipient, tokenId, amountNum)
    if (success) {
      setRecipient("")
      setTokenType("0")
      setAmount("1")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-purple-900/90 border-purple-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-[Pirata One] text-yellow-400">Transferir Tokens</DialogTitle>
          <DialogDescription className="text-purple-300">
            Transfiere tokens Pirot o accesorios NFT a otra dirección.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-purple-200">
              Dirección del Destinatario
            </Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-purple-800/50 border-purple-600 text-white placeholder:text-purple-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenType" className="text-purple-200">
              Tipo de Token
            </Label>
            <Select value={tokenType} onValueChange={setTokenType}>
              <SelectTrigger className="bg-purple-800/50 border-purple-600 text-white">
                <SelectValue placeholder="Selecciona un token" />
              </SelectTrigger>
              <SelectContent className="bg-purple-900 border-purple-700 text-white">
                <SelectItem value="0">Pirot ({balance})</SelectItem>
                <SelectItem value="1">Loro Rojo ({loroRojoBalance})</SelectItem>
                <SelectItem value="2">Loro Morado ({loroMoradoBalance})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-purple-200">
              Cantidad
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-purple-800/50 border-purple-600 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-purple-500 text-purple-200 hover:bg-purple-800/30"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={isLoading}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-600 hover:to-red-600"
          >
            {isLoading ? "Procesando..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
