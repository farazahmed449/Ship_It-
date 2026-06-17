import { useState } from 'react'
import client from '../api/client'
import styles from './AlertsPanel.module.css'

// Shows unread alerts. Each can be marked read, which removes it from the list.
// `alerts` is the initial list; `onChange` (optional) notifies the parent of
// the new unread count after a change.
export default function AlertsPanel({ alerts, onChange }) {
  const [items, setItems] = useState(alerts)
  const [busyId, setBusyId] = useState(null)

  async function markRead(id) {
    setBusyId(id)
    try {
      await client.put(`/alerts/${id}/read`)
      const next = items.filter((a) => a.id !== id)
      setItems(next)
      onChange?.(next.length)
    } catch {
      // Leave the alert in place if the request fails.
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Alerts</h3>
      {items.length === 0 ? (
        <div className={styles.empty}>🎉 You're all caught up — no new alerts.</div>
      ) : (
        <div className={styles.list}>
          {items.map((a) => (
            <div
              key={a.id}
              className={
                a.type === 'limit_exceeded'
                  ? `${styles.alert} ${styles.exceeded}`
                  : styles.alert
              }
            >
              <span className={styles.message}>{a.message}</span>
              <button
                className={styles.markBtn}
                onClick={() => markRead(a.id)}
                disabled={busyId === a.id}
              >
                {busyId === a.id ? '…' : 'Mark read'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
