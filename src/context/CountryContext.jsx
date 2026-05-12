// src/context/CountryContext.jsx
import { createContext, useState, useCallback } from 'react'

export const CountryContext = createContext(null)

export const CountryProvider = ({ children }) => {
  const [selectedCountry, setSelected]        = useState('US')
  const [userCountryAccess, setAccess]        = useState(null)
  const [allowedCountries, setAllowed]        = useState(['US'])
  const [initialized, setInitialized]         = useState(false)

  const initCountry = useCallback((countryAccess) => {
    if (!countryAccess) return

    setAccess(countryAccess)

    const allowed = countryAccess === 'ALL'
      ? ['PK', 'US']
      : countryAccess.split(',').map(c => c.trim()).filter(Boolean)

    setAllowed(allowed)

    const stored = sessionStorage.getItem('bd_country')
    const valid  = stored && (countryAccess === 'ALL' || allowed.includes(stored))
    setSelected(valid ? stored : allowed[0] || 'US')
    setInitialized(true)
  }, [])

  const switchCountry = useCallback((code) => {
    setSelected(code)
    sessionStorage.setItem('bd_country', code)
  }, [])

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry: switchCountry,
      initCountry,
      canSwitch:          allowedCountries.length > 1,
      allowedCountries,
      userCountryAccess,
      initialized,
    }}>
      {children}
    </CountryContext.Provider>
  )
}
