import { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import './Card.scss'

const CARD_HEIGHT = 500
const CLOSE_ANIMATION_DURATION = 800

function Card({ card, offset, isOpen, isHidden, cardSpacing, onClick, onClose }) {
  const isPopup = card.type === 'popup'
  const isNoOpen = card.type === 'no_open'
  const isFoldDown = card.type === 'fold_down'
  const isFold = !isPopup && !isNoOpen && !isFoldDown

  const [leftSize, setLeftSize] = useState({ width: 200, height: CARD_HEIGHT })
  const [rightSize, setRightSize] = useState({ width: 200, height: CARD_HEIGHT })
  const [coverSize, setCoverSize] = useState({ width: 200, height: CARD_HEIGHT })
  const [isClosing, setIsClosing] = useState(false)
  const wasOpenRef = useRef(false)

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panStartOffsetRef = useRef({ x: 0, y: 0 })
  const cardInnerRef = useRef(null)
  const cardContainerRef = useRef(null)
  const lastPinchDistanceRef = useRef(null)

  const MIN_ZOOM = 1
  const MAX_ZOOM = 3

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      setIsClosing(true)
      const timer = setTimeout(() => setIsClosing(false), CLOSE_ANIMATION_DURATION)
      return () => clearTimeout(timer)
    }
    wasOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (card.coverImage) {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight
        setCoverSize({
          width: CARD_HEIGHT * aspectRatio,
          height: CARD_HEIGHT
        })
      }
      img.src = card.coverImage
    }

    if (card.leftImage && card.rightImage) {
      const leftImg = new Image()
      const rightImg = new Image()
      let leftLoaded = false
      let rightLoaded = false
      let leftAspect = 1
      let rightAspect = 1

      const calculateConsistentSizes = () => {
        if (leftLoaded && rightLoaded) {
          const maxWidth = Math.max(CARD_HEIGHT * leftAspect, CARD_HEIGHT * rightAspect)
          setLeftSize({ width: maxWidth, height: CARD_HEIGHT })
          setRightSize({ width: maxWidth, height: CARD_HEIGHT })
        }
      }

      leftImg.onload = () => {
        leftAspect = leftImg.naturalWidth / leftImg.naturalHeight
        leftLoaded = true
        calculateConsistentSizes()
      }

      rightImg.onload = () => {
        rightAspect = rightImg.naturalWidth / rightImg.naturalHeight
        rightLoaded = true
        calculateConsistentSizes()
      }

      leftImg.src = card.leftImage
      rightImg.src = card.rightImage
    } else {
      if (card.leftImage) {
        const img = new Image()
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight
          setLeftSize({
            width: CARD_HEIGHT * aspectRatio,
            height: CARD_HEIGHT
          })
        }
        img.src = card.leftImage
      }

      if (card.rightImage) {
        const img = new Image()
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight
          setRightSize({
            width: CARD_HEIGHT * aspectRatio,
            height: CARD_HEIGHT
          })
        }
        img.src = card.rightImage
      }
    }
  }, [card.coverImage, card.leftImage, card.rightImage])

  // Reset pan offset and zoom when card closes, or set initial pan when opening
  useEffect(() => {
    if (!isOpen) {
      setPanOffset({ x: 0, y: 0 })
      setZoomLevel(1)
    } else if (isFold) {
      // When opening a fold card, check if it fits in viewport
      const viewportWidth = window.innerWidth
      const totalWidth = leftSize.width + rightSize.width

      if (totalWidth > viewportWidth) {
        const overflow = totalWidth - viewportWidth
        const maxX = overflow / 2
        const minX = -overflow / 2

        // Start panned based on "opens" config (default to left)
        const opensDirection = card.opens || 'left'
        if (opensDirection === 'left') {
          setPanOffset({ x: maxX, y: 0 })
        } else {
          setPanOffset({ x: minX, y: 0 })
        }
      }
    }
  }, [isOpen, isFold, leftSize.width, rightSize.width, card.opens])

  // Block system zoom when card is open (for fold cards) - desktop only
  useEffect(() => {
    if (!isOpen || !isFold) return

    const preventZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', preventZoom, { passive: false })

    return () => {
      document.removeEventListener('wheel', preventZoom)
    }
  }, [isOpen, isFold])

  // Calculate pan bounds based on viewport, image widths, and zoom level
  const getPanBounds = useCallback(() => {
    if (!cardInnerRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scaledWidth = (leftSize.width + rightSize.width) * zoomLevel
    const scaledHeight = leftSize.height * zoomLevel

    // Simple overflow-based bounds
    let minX = 0, maxX = 0
    if (scaledWidth > viewportWidth) {
      const overflow = scaledWidth - viewportWidth
      maxX = overflow / (1.9 - Math.log(zoomLevel))
      minX = -overflow / (1.9 - Math.log(zoomLevel))
    }

    // Vertical bounds (only when zoomed)
    let minY = 0, maxY = 0
    if (scaledHeight > viewportHeight) {
      const overflow = scaledHeight - viewportHeight
      maxY = overflow / (1.9 - Math.log(zoomLevel))
      minY = -overflow / (1.9 - Math.log(zoomLevel))
    }

    return { minX, maxX, minY, maxY }
  }, [leftSize.width, rightSize.width, leftSize.height, zoomLevel])

  const handlePanStart = useCallback((clientX, clientY) => {
    if (!isOpen || !isFold) return

    setIsPanning(true)
    panStartRef.current = { x: clientX, y: clientY }
    panStartOffsetRef.current = { ...panOffset }
  }, [isOpen, isFold, panOffset])

  const handlePanMove = useCallback((clientX, clientY) => {
    if (!isPanning) return

    const deltaX = clientX - panStartRef.current.x
    const deltaY = clientY - panStartRef.current.y
    const newOffsetX = panStartOffsetRef.current.x + deltaX
    const newOffsetY = panStartOffsetRef.current.y + deltaY
    const bounds = getPanBounds()

    // Clamp to bounds
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, newOffsetX))
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, newOffsetY))
    setPanOffset({ x: clampedX, y: clampedY })
  }, [isPanning, getPanBounds])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Mouse events
  const handleMouseDown = useCallback((e) => {
    if (!isOpen || !isFold) return
    e.preventDefault()
    handlePanStart(e.clientX, e.clientY)
  }, [isOpen, isFold, handlePanStart])

  const handleMouseMove = useCallback((e) => {
    handlePanMove(e.clientX, e.clientY)
  }, [handlePanMove])

  const handleMouseUp = useCallback(() => {
    handlePanEnd()
  }, [handlePanEnd])

  // Touch events for panning (single touch)
  const handleTouchStart = useCallback((e) => {
    if (!isOpen || !isFold) return

    if (e.touches.length === 1) {
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
    } else if (e.touches.length === 2) {
      // Start pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      lastPinchDistanceRef.current = distance
      setIsPanning(false)
    }
  }, [isOpen, isFold, handlePanStart])

  const handleTouchMove = useCallback((e) => {
    if (!isOpen || !isFold) return

    if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )

      const delta = distance - lastPinchDistanceRef.current
      const zoomDelta = delta * 0.01

      setZoomLevel(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + zoomDelta)))
      lastPinchDistanceRef.current = distance
    } else if (e.touches.length === 1 && isPanning) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [isOpen, isFold, isPanning, handlePanMove])

  const handleTouchEnd = useCallback(() => {
    handlePanEnd()
    lastPinchDistanceRef.current = null
  }, [handlePanEnd])

  // Wheel zoom (with ctrl/meta key or trackpad pinch)
  const handleWheel = useCallback((e) => {
    if (!isOpen || !isFold) return

    // Check if it's a pinch gesture (ctrlKey is set for trackpad pinch)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const zoomDelta = -e.deltaY * 0.01

      setZoomLevel(prev => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + zoomDelta))
        return newZoom
      })
    }
  }, [isOpen, isFold])

  // Global mouse/touch listeners when panning
  useEffect(() => {
    if (!isPanning) return

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPanning, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Clamp pan offset when zoom changes
  useEffect(() => {
    const bounds = getPanBounds()
    setPanOffset(prev => ({
      x: Math.max(bounds.minX, Math.min(bounds.maxX, prev.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, prev.y))
    }))
  }, [zoomLevel, getPanBounds])

  const getTransform = () => {
    if (isOpen) {
      if (isNoOpen) {
        return `translateX(0px) scale(1.4)`
      }
      if (isPopup) {
        return `translateX(0px) scale(1)`
      }
      if (isFoldDown) {
        const centerOffset = leftSize.height / 2
        return `translateY(${centerOffset}px) scale(1)`
      }
      const totalOpenedWidth = leftSize.width + rightSize.width
      const centerOffset = (totalOpenedWidth - rightSize.width) / 2
      return `translate(${centerOffset + panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
    }

    if (isHidden) {
      const direction = offset < 0 ? -1 : 1
      return `translateX(${direction * 150}vw) scale(0.8)`
    }

    const baseTranslateX = offset * cardSpacing
    const rotateY = offset * -45
    const scale = 1 - Math.abs(offset) * 0.1

    return `translateX(${baseTranslateX}px) rotateY(${rotateY}deg) scale(${scale})`
  }

  const getZIndex = () => {
    if (isOpen) return 100
    return Math.round(50 - Math.abs(offset) * 10)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    // Don't close if we just finished panning (small threshold for accidental drags)
    const panDelta = Math.hypot(
      panOffset.x - panStartOffsetRef.current.x,
      panOffset.y - panStartOffsetRef.current.y
    )
    if (isOpen && isFold && panDelta > 5) {
      return
    }
    if (isOpen) {
      onClose()
    } else {
      onClick()
    }
  }

  const isVisuallyActive = Math.abs(offset) < 0.5

  const cardTypeClass = isNoOpen ? 'no-open' : isPopup ? 'popup' : isFoldDown ? 'fold-down' : 'fold'

  return (
    <div
      ref={cardContainerRef}
      className={`card-container ${cardTypeClass} ${isVisuallyActive ? 'active' : ''} ${isOpen ? 'open' : ''} ${isHidden ? 'hidden' : ''} ${isPanning ? 'panning' : ''} ${zoomLevel > 1 ? 'zoomed' : ''}`}
      style={{
        '--width': coverSize.width + 'px',
        '--height': coverSize.height + 'px',
        '--aspect-ratio': coverSize.width / coverSize.height,
        transform: getTransform(),
        zIndex: getZIndex()
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
    >
      <div className="card-inner" ref={cardInnerRef}>
        {isNoOpen ? (
          <div className="card-cover">
            <img src={card.coverImage} alt={`${card.name} - cover`} />
          </div>
        ) : isPopup ? (
          <>
            <div className="popup-wrapper">
              {card.leftImage && <div className="popup-content">
                <img src={card.leftImage} alt={`${card.name} - popup`} />
              </div>}

              <div className="popup-message">
                <img src={card.rightImage} alt={`${card.name} - message`} />
              </div>
            </div>

            <div className="card-cover">
              <img src={card.coverImage} alt={`${card.name} - cover`} />
            </div>
          </>
        ) : (
          <>
            {card.leftImage && <div
              className={isFoldDown ? "card-top" : "card-left"}
              style={(isOpen || isClosing) ? {
                '--left-width': leftSize.width + 'px',
                '--left-height': leftSize.height + 'px',
                '--left-aspect-ratio': leftSize.width / leftSize.height
              } : undefined}
            >
              <img src={card.leftImage} alt={`${card.name} - inside ${isFoldDown ? 'top' : 'left'}`} />
            </div>}

            <div
              className={isFoldDown ? "card-bottom" : "card-right"}
              style={(isOpen || isClosing) ? {
                '--right-width': rightSize.width + 'px',
                '--right-height': rightSize.height + 'px',
                '--right-aspect-ratio': rightSize.width / rightSize.height
              } : undefined}
            >
              <img src={card.rightImage} alt={`${card.name} - inside ${isFoldDown ? 'bottom' : 'right'}`} />
            </div>

            <div className="card-cover">
              <img src={card.coverImage} alt={`${card.name} - cover`} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

Card.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['fold', 'fold_down', 'popup', 'no_open']),
    opens: PropTypes.oneOf(['left', 'right']),
    coverImage: PropTypes.string.isRequired,
    leftImage: PropTypes.string,
    rightImage: PropTypes.string,
  }).isRequired,
  offset: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isHidden: PropTypes.bool.isRequired,
  cardSpacing: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default Card
