import { useState, useEffect, useCallback, useRef } from 'react'
import Card from './components/Card'
import cardsData from './data/cards.json'
import './App.scss'

const CARD_WIDTH = 200
const CARD_GAP = 20
const CARD_SPACING = CARD_WIDTH + CARD_GAP
const PASSCODE = 'Eliana'

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/`
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getCookie('cards_auth') === 'true')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = getCookie('cards_index')
    const parsed = saved ? parseInt(saved, 10) : NaN
    return !isNaN(parsed) && parsed >= 0 && parsed < cardsData.length ? parsed : Math.floor(cardsData.length / 2)
  })
  const [openCardId, setOpenCardId] = useState(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)

  const dragStartX = useRef(0)
  const activeIndexRef = useRef(activeIndex)

  activeIndexRef.current = activeIndex

  useEffect(() => {
    setCookie('cards_index', activeIndex.toString())
  }, [activeIndex])

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === PASSCODE) {
      setCookie('cards_auth', 'true')
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  const handleCardClick = (cardId, index) => {
    if (hasDragged) return

    if (openCardId === cardId) {
      setOpenCardId(null)
    } else if (index === activeIndex) {
      setOpenCardId(cardId)
    } else {
      setActiveIndex(index)
    }
  }

  const handleClose = () => {
    setOpenCardId(null)
  }

  const navigateCards = useCallback((direction) => {
    if (openCardId !== null) return

    setActiveIndex((prev) => {
      const newIndex = prev + direction
      if (newIndex < 0) return 0
      if (newIndex >= cardsData.length) return cardsData.length - 1
      return newIndex
    })
  }, [openCardId])

  const handleDragStart = (clientX) => {
    if (openCardId !== null) return
    setIsDragging(true)
    setHasDragged(false)
    dragStartX.current = clientX
  }

  const handleDragMove = (clientX) => {
    if (!isDragging || openCardId !== null) return

    const diff = clientX - dragStartX.current

    if (Math.abs(diff) > 5) {
      setHasDragged(true)
    }

    setDragOffset(diff)
  }

  const handleDragEnd = () => {
    if (!isDragging) return

    const cardShift = Math.round(-dragOffset / CARD_SPACING)
    const newIndex = Math.max(0, Math.min(cardsData.length - 1, activeIndex + cardShift))

    setActiveIndex(newIndex)
    setIsDragging(false)
    setDragOffset(0)
    setTimeout(() => setHasDragged(false), 50)
  }

  const handleMouseDown = (e) => {
    handleDragStart(e.clientX)
  }

  const handleMouseMove = (e) => {
    handleDragMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      handleDragEnd()
    }
  }

  const handleTouchStart = (e) => {
    handleDragStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e) => {
    handleDragMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        navigateCards(-1)
      } else if (e.key === 'ArrowRight') {
        navigateCards(1)
      } else if (e.key === 'Escape' && openCardId !== null) {
        setOpenCardId(null)
      } else if (e.key === 'Enter' && openCardId === null) {
        setOpenCardId(cardsData[activeIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigateCards, openCardId, activeIndex])

  const activeCard = cardsData[activeIndex]

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="vignette" />
        <div className="login-screen">
          <form onSubmit={handleLogin} className="login-form">
            <h1>Welcome</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter login"
              className={error ? 'error' : ''}
              autoFocus
            />
            <button type="submit">Enter</button>
            {error && <p className="login-error">Incorrect passcode</p>}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className={`vignette ${openCardId !== null ? 'card-open' : ''}`} />

      {/* {openCardId !== null && (
        <div className="card-overlay" onClick={handleClose} />
      )} */}

      <div
        className={`carousel ${openCardId !== null ? 'card-open' : ''} ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="carousel-track">
          {cardsData.map((card, index) => {
            const offset = index - activeIndex
            const isOpen = openCardId === card.id
            const isHidden = openCardId !== null && openCardId !== card.id

            return (
              <Card
                key={card.id}
                card={card}
                offset={offset}
                isOpen={isOpen}
                isHidden={isHidden}
                cardSpacing={CARD_SPACING}
                dragOffset={dragOffset}
                onClick={() => handleCardClick(card.id, index)}
                onClose={handleClose}
              />
            )
          })}
        </div>
      </div>

      <div className={`card-name ${openCardId !== null ? 'hidden' : ''}`}>
        <h2>{activeCard.name}</h2>
        {activeCard.occasion && <p className="card-occasion">{activeCard.occasion}</p>}
      </div>

      {/* {openCardId === null && (
        <div className="navigation-hint">
          <span>← →</span> Navigate | <span>Click</span> or <span>Swipe</span>
        </div>
      )} */}
    </div>
  )
}

export default App
