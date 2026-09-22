import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Executa uma função assíncrona e expõe { data, error, loading, reload }.
 * Roda de novo quando algum valor em `deps` muda.
 */
export function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // Guarda a função mais recente sem recriar `reload` a cada render.
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  // Ignora respostas de chamadas antigas quando outra já começou.
  const callIdRef = useRef(0)

  const reload = useCallback(async () => {
    const callId = ++callIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current()
      if (callId === callIdRef.current) setData(result)
    } catch (err) {
      if (callId === callIdRef.current) setError(err)
    } finally {
      if (callId === callIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload }
}
