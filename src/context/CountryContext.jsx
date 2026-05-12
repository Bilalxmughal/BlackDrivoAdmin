// src/context/CountryContext.jsx
import { createContext, useState, useCallback } from 'react'

export const CountryContext = createContext(null)

export const CountryProvider = ({ children }) => {
  const [selectedCountry, setSelectedCountry]     = useState('US') // default US, not null
  const [userCountryAccess, setUserCountryAccess] = useState(null)
  const [allowedCountries, setAllowedCountries]   = useState(['US'])
  const [initialized, setInitialized]             = useState(false)

  const initCountry = useCallback((countryAccess) => {
    setUserCountryAccess(countryAccess)

    let allowed = []
    if (!countryAccess || countryAccess === 'ALL') {
      allowed = ['PK', 'US']
    } else {
      allowed = countryAccess.split(',').map(c => c.trim()).filter(Boolean)
    }
    setAllowedCountries(allowed)

    // Check session storage for last selected country
    const stored = sessionStorage.getItem('bd_country')
    const canUseStored = stored && (countryAccess === 'ALL' || allowed.includes(stored))

    setSelectedCountry(canUseStored ? stored : (allowed[0] || 'US'))
    setInitialized(true)
  }, [])

  const canSwitch = allowedCountries.length > 1

  const switchCountry = useCallback((code) => {
    if (!canSwitch) return
    setSelectedCountry(code)
    sessionStorage.setItem('bd_country', code)
  }, [canSwitch])

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry: switchCountry,
      initCountry,
      canSwitch,
      allowedCountries,
      userCountryAccess,
      initialized,
    }}>
      {children}
    </CountryContext.Provider>
  )
}
