"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

// Context for Stripe functionality
const StripeContext = createContext<{
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}>({
  isLoading: false,
  setIsLoading: () => {},
})

export function Stripe({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  return <StripeContext.Provider value={{ isLoading, setIsLoading }}>{children}</StripeContext.Provider>
}

export function StripeCheckout() {
  const { isLoading, setIsLoading } = useContext(StripeContext)

  // This is a placeholder component that would be replaced with actual Stripe integration
  return (
    <div className="w-full max-w-md mx-auto bg-purple-900/50 backdrop-blur-md rounded-2xl p-8 border border-purple-700/50 shadow-lg">
      <h2 className="text-3xl font-[Pirata One] mb-6 text-center text-yellow-400">Comprar Tokens Pirot</h2>
      <p className="text-purple-300 mb-6 text-center">Usa Stripe para comprar tokens Pirot de forma segura.</p>
      <div className="space-y-4">
        <div className="bg-purple-800/50 rounded-xl p-4 border border-purple-600/50">
          <p className="text-purple-300 mb-2">Paquete:</p>
          <select className="w-full bg-purple-950 border border-purple-700 rounded-md p-2 text-white">
            <option value="small">100 Tokens - $10</option>
            <option value="medium">500 Tokens - $45</option>
            <option value="large">1000 Tokens - $80</option>
          </select>
        </div>
        <button
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium"
          onClick={() => setIsLoading(!isLoading)}
        >
          {isLoading ? "Procesando..." : "Pagar con Stripe"}
        </button>
      </div>
    </div>
  )
}

export function StripeProducts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg">
        <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Básico</h3>
        <p className="text-3xl font-bold text-white mb-2">
          100 <span className="text-sm text-purple-300">Tokens</span>
        </p>
        <p className="text-purple-300 mb-4">Perfecto para comenzar tu aventura pirata.</p>
        <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
          $10 USD
        </button>
      </div>
      <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg">
        <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Aventurero</h3>
        <p className="text-3xl font-bold text-white mb-2">
          500 <span className="text-sm text-purple-300">Tokens</span>
        </p>
        <p className="text-purple-300 mb-4">Para piratas con experiencia en los mares.</p>
        <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
          $45 USD
        </button>
      </div>
      <div className="bg-purple-900/50 backdrop-blur-md rounded-2xl p-6 border border-purple-700/50 shadow-lg">
        <h3 className="text-xl font-[Pirata One] mb-4 text-yellow-400">Paquete Capitán</h3>
        <p className="text-3xl font-bold text-white mb-2">
          1000 <span className="text-sm text-purple-300">Tokens</span>
        </p>
        <p className="text-purple-300 mb-4">Domina los mares con este botín completo.</p>
        <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium">
          $80 USD
        </button>
      </div>
    </div>
  )
}
