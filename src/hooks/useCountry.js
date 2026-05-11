// src/hooks/useCountry.js
import { useContext } from 'react'
import { CountryContext } from '../context/CountryContext'

export const useCountry = () => {
  const ctx = useContext(CountryContext)
  if (!ctx) throw new Error('useCountry must be used inside CountryProvider')
  return ctx
}
