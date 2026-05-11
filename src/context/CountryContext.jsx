// src/context/CountryContext.jsx
import { createContext, useState } from 'react'

export const CountryContext = createContext(null)

export const CountryProvider = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [userCountryAccess, setUserCountryAccess] = useState(null)
  // array of allowed countries e.g. ['PK'] or ['PK','US'] or ['ALL']
  const [allowedCountries, setAllowedCountries] = useState([])

  const initCountry = (countryAccess) => {
    // countryAccess is text: 'PK' | 'US' | 'ALL' | 'PK,US'
    setUserCountryAccess(countryAccess)

    // Parse allowed countries
    let allowed = []
    if (!countryAccess || countryAccess === 'ALL') {
      allowed = ['PK', 'US']
    } else {
      allowed = countryAccess.split(',').map(c => c.trim()).filter(Boolean)
    }
    setAllowedCountries(allowed)

    // Set initial selected country
    const stored = sessionStorage.getItem('bd_country')
    if (stored && (countryAccess === 'ALL' || allowed.includes(stored))) {
      setSelectedCountry(stored)
    } else {
      setSelectedCountry(allowed[0] || 'US')
    }
  }

  // super_admin & admin with multiple countries can switch
  const canSwitch = allowedCountries.length > 1 || userCountryAccess === 'ALL'

  const switchCountry = (code) => {
    if (!canSwitch) return
    setSelectedCountry(code)
    sessionStorage.setItem('bd_country', code)
  }

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry: switchCountry,
      initCountry,
      canSwitch,
      allowedCountries,
      userCountryAccess,
    }}>
      {children}
    </CountryContext.Provider>
  )
}
