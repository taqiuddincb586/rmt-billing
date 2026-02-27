import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0" style={{background: 'rgba(10,22,40,0.7)', backdropFilter: 'blur(8px)'}} onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-fade-in-up`}
        style={{boxShadow: '0 25px 60px rgba(10,22,40,0.3)'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-base font-bold" style={{fontFamily: 'Playfair Display, serif', color: 'var(--text-dark)'}}>{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X size={15} style={{color: 'var(--text-light)'}} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
