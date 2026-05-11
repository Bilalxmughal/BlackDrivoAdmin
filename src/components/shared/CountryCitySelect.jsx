// src/components/shared/CountryCitySelect.jsx
// Reusable country + city + phone code selector
// Use in: AddPassengerForm, AddDriverForm, NewBooking, App registration

import { useEffect } from 'react'
import { COUNTRIES } from '../../utils/constants'
import fStyles from './Form.module.css'

/**
 * Props:
 *  country, city, phone — current values
 *  onChange(field, value) — setter
 *  errors — { country, city, phone }
 *  showPhone — bool (default true)
 *  required — bool
 */
export default function CountryCitySelect({
  country = '',
  city    = '',
  phone   = '',
  onChange,
  errors  = {},
  showPhone = true,
  required  = false,
}) {
  const countryData   = COUNTRIES[country] || null
  const cities        = countryData?.cities || []
  const phoneCode     = countryData?.phoneCode || ''

  // Reset city when country changes
  useEffect(() => {
    if (country && city) {
      const validCity = cities.find(c => c.value === city)
      if (!validCity) onChange('city', '')
    }
  }, [country])

  // Strip country code from phone for display
  const phoneNumOnly = phone.startsWith(phoneCode) ? phone.slice(phoneCode.length) : phone

  const handlePhone = (val) => {
    // Only digits
    const digits = val.replace(/\D/g, '')
    onChange('phone', phoneCode ? `${phoneCode}${digits}` : digits)
  }

  return (
    <>
      {/* Country */}
      <div className={fStyles.field}>
        <label className={fStyles.label}>
          Country {required && <span className={fStyles.required}>*</span>}
        </label>
        <select
          className={`${fStyles.select} ${errors.country ? fStyles.error : ''}`}
          value={country}
          onChange={e => { onChange('country', e.target.value); onChange('city', ''); onChange('phone', '') }}
        >
          <option value="">— Select Country —</option>
          {Object.values(COUNTRIES).map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        {errors.country && <span className={fStyles.errorMsg}>{errors.country}</span>}
      </div>

      {/* City */}
      <div className={fStyles.field}>
        <label className={fStyles.label}>
          City {required && <span className={fStyles.required}>*</span>}
        </label>
        <select
          className={`${fStyles.select} ${errors.city ? fStyles.error : ''}`}
          value={city}
          onChange={e => onChange('city', e.target.value)}
          disabled={!country}
        >
          <option value="">— Select City —</option>
          {cities.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {errors.city && <span className={fStyles.errorMsg}>{errors.city}</span>}
      </div>

      {/* Phone */}
      {showPhone && (
        <div className={fStyles.field} style={{ gridColumn: '1 / -1' }}>
          <label className={fStyles.label}>
            Phone {required && <span className={fStyles.required}>*</span>}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Country code badge */}
            <div style={{
              height: 42, padding: '0 14px', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)', background: 'var(--border)',
              display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600,
              color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0,
              minWidth: 64,
            }}>
              {phoneCode || '—'}
            </div>
            <input
              className={`${fStyles.input} ${errors.phone ? fStyles.error : ''}`}
              placeholder={
                country === 'PK' ? '3XX XXXXXXX' :
                country === 'US' ? 'XXX XXX XXXX' :
                'Select country first'
              }
              value={phoneNumOnly}
              onChange={e => handlePhone(e.target.value)}
              disabled={!country}
              maxLength={country === 'PK' ? 10 : 10}
            />
          </div>
          {errors.phone && <span className={fStyles.errorMsg}>{errors.phone}</span>}
        </div>
      )}
    </>
  )
}
