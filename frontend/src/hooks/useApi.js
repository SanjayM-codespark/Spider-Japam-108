import { useEffect, useState } from 'react'

function useApi(url, { requestOptions, deps = [] } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestKey = JSON.stringify(requestOptions)

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url, requestKey ? JSON.parse(requestKey) : undefined)
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const json = await response.json()
        if (active) setData(json)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    if (url) run()

    return () => {
      active = false
    }
  }, [url, requestKey, deps])

  return { data, loading, error }
}

export default useApi