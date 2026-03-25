// src/services/apiCache.js
const cache = {}

export const getEntry = (key) => {
  if (!cache[key]) cache[key] = { data: null, ts: 0, pending: null, listeners: new Set() }
  return cache[key]
}

export const isValid = (entry, ttl = 10_000) =>
  entry.data !== null && Date.now() - entry.ts < ttl

export const invalidateCache = (url, params = {}) => {
  const key = `${url}::${JSON.stringify(params)}`
  if (cache[key]) cache[key].ts = 0
}

export const invalidateCachePrefix = (prefix) => {
  Object.keys(cache).forEach(key => {
    if (key.startsWith(prefix)) cache[key].ts = 0
  })
}

export const clearCache = () => {
  Object.keys(cache).forEach(key => delete cache[key])
}