// src/utils/constants.js

export const COUNTRIES = {
  PK: {
    name:    'Pakistan',
    code:    'PK',
    phoneCode: '+92',

    cities: [
      { value: 'lahore',    label: 'Lahore',    prefix: 'PL' },
      { value: 'karachi',   label: 'Karachi',   prefix: 'PK' },
      { value: 'islamabad', label: 'Islamabad', prefix: 'PI' },
    ],
  },
  US: {
    name:    'United States',
    code:    'US',
    phoneCode: '+1',

    cities: [
      { value: 'atlanta',   label: 'Atlanta',      prefix: 'AA' },
      { value: 'new_york',  label: 'New York',     prefix: 'AN' },
      { value: 'chicago',   label: 'Chicago',      prefix: 'AC' },
      { value: 'houston',   label: 'Houston',      prefix: 'AH' },
      { value: 'miami',     label: 'Miami',        prefix: 'AM' },
    ],
  },
}

export const RIDE_TYPES = [
  { value: 'city_to_city',    label: 'City to City'       },
  { value: 'airport_pickup',  label: 'Airport Pickup'     },
  { value: 'airport_drop',    label: 'Airport Drop'       },
  { value: 'by_hourly',       label: 'By Hourly'          },
]

export const ALL_CITIES = [
  ...COUNTRIES.PK.cities,
  ...COUNTRIES.US.cities,
]

// Get city prefix for booking ref
export const getCityPrefix = (city, country) => {
  const countryData = COUNTRIES[country]
  if (!countryData) return 'XX'
  const cityData = countryData.cities.find(c => c.value === city)
  return cityData?.prefix || 'XX'
}

// Generate unique numeric ID (6 digits)
export const generateUniqueId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
