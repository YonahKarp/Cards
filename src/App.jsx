import { useState, useEffect, useCallback, useRef } from 'react'
import Card from './components/Card'
import rawCardsData from './data/cards.json'
import './App.scss'

const BASE_URL = import.meta.env.BASE_URL

const cardsData = rawCardsData.map(card => ({
  ...card,
  coverImage: BASE_URL + card.coverImage.slice(1),
  leftImage: card.leftImage ? BASE_URL + card.leftImage.slice(1) : undefined,
  rightImage: card.rightImage ? BASE_URL + card.rightImage.slice(1) : undefined,
}))

const CARD_WIDTH = 200
const CARD_GAP = 20
const CARD_SPACING = CARD_WIDTH + CARD_GAP
const SWIPE_THRESHOLD = 50
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
  const [hasSwiped, setHasSwiped] = useState(false)

  const swipeStartX = useRef(0)
  const swipeHandled = useRef(false)

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
    if (hasSwiped) return

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

  const handleSwipeStart = (clientX) => {
    if (openCardId !== null) return
    swipeStartX.current = clientX
    swipeHandled.current = false
    setHasSwiped(false)
  }

  const handleSwipeMove = (clientX) => {
    if (openCardId !== null || swipeHandled.current) return

    const diff = clientX - swipeStartX.current

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      swipeHandled.current = true
      setHasSwiped(true)

      if (diff > 0) {
        navigateCards(-1)
      } else {
        navigateCards(1)
      }
    }
  }

  const handleSwipeEnd = () => {
    setTimeout(() => setHasSwiped(false), 100)
  }

  const handleMouseDown = (e) => {
    handleSwipeStart(e.clientX)
  }

  const handleMouseMove = (e) => {
    handleSwipeMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleSwipeEnd()
  }

  const handleMouseLeave = () => {
    handleSwipeEnd()
  }

  const handleTouchStart = (e) => {
    handleSwipeStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e) => {
    handleSwipeMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleSwipeEnd()
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

      <div
        className={`carousel ${openCardId !== null ? 'card-open' : ''}`}
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
            const isInRange = Math.abs(offset) <= 3

            if (!isInRange && !isOpen) {
              return null
            }

            return (
              <Card
                key={card.id}
                card={card}
                offset={offset}
                isOpen={isOpen}
                isHidden={isHidden}
                cardSpacing={CARD_SPACING}
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
    </div>
  )
}

export default App
