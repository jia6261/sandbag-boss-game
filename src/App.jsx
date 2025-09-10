import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import './App.css'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const PLAYER_SIZE = 40
const BOSS_SIZE = 80
const SANDBAG_SIZE = 20

function App() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [gameState, setGameState] = useState('menu') // 'menu', 'playing', 'victory', 'defeat'
  const [playerHealth, setPlayerHealth] = useState(100)
  const [bossHealth, setBossHealth] = useState(300)
  const [score, setScore] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 })

  // 游戏对象状态
  const [player, setPlayer] = useState({ x: 100, y: GAME_HEIGHT - 100 })
  const [boss, setBoss] = useState({ 
    x: GAME_WIDTH - 150, 
    y: 100, 
    vx: 2, 
    vy: 1,
    attackTimer: 0,
    isAttacking: false
  })
  const [sandbags, setSandbags] = useState([])
  const [bossProjectiles, setBossProjectiles] = useState([])
  const [particles, setParticles] = useState([])

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return

    // 更新Boss位置
    setBoss(prev => {
      let newX = prev.x + prev.vx
      let newY = prev.y + prev.vy
      let newVx = prev.vx
      let newVy = prev.vy

      // Boss边界检测
      if (newX <= 0 || newX >= GAME_WIDTH - BOSS_SIZE) {
        newVx = -newVx
      }
      if (newY <= 0 || newY >= GAME_HEIGHT - BOSS_SIZE) {
        newVy = -newVy
      }

      // Boss攻击逻辑
      let attackTimer = prev.attackTimer + 1
      let isAttacking = prev.isAttacking

      if (attackTimer > 120 && !isAttacking) { // 每2秒攻击一次
        isAttacking = true
        attackTimer = 0
        
        // 发射投射物
        setBossProjectiles(projectiles => [...projectiles, {
          x: newX + BOSS_SIZE / 2,
          y: newY + BOSS_SIZE,
          vx: (Math.random() - 0.5) * 4,
          vy: 3,
          id: Date.now()
        }])
      }

      if (isAttacking && attackTimer > 30) {
        isAttacking = false
      }

      return {
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        attackTimer,
        isAttacking
      }
    })

    // 更新沙包位置
    setSandbags(prev => prev.map(sandbag => ({
      ...sandbag,
      x: sandbag.x + sandbag.vx,
      y: sandbag.y + sandbag.vy,
      vy: sandbag.vy + 0.2 // 减小重力效果
    })).filter(sandbag => 
      sandbag.x > -SANDBAG_SIZE && 
      sandbag.x < GAME_WIDTH + SANDBAG_SIZE && 
      sandbag.y < GAME_HEIGHT + SANDBAG_SIZE
    ))

    // 更新Boss投射物
    setBossProjectiles(prev => prev.map(projectile => ({
      ...projectile,
      x: projectile.x + projectile.vx,
      y: projectile.y + projectile.vy
    })).filter(projectile => 
      projectile.x > -20 && 
      projectile.x < GAME_WIDTH + 20 && 
      projectile.y > -20 && 
      projectile.y < GAME_HEIGHT + 20
    ))

    // 碰撞检测 - 沙包击中Boss
    setSandbags(prev => {
      const remainingSandbags = []
      prev.forEach(sandbag => {
        const hitBoss = sandbag.x < boss.x + BOSS_SIZE &&
                      sandbag.x + SANDBAG_SIZE > boss.x &&
                      sandbag.y < boss.y + BOSS_SIZE &&
                      sandbag.y + SANDBAG_SIZE > boss.y

        if (hitBoss) {
          setBossHealth(health => Math.max(0, health - 20))
          setScore(score => score + 100)
          
          // 添加击中特效
          setParticles(particles => [...particles, {
            x: sandbag.x,
            y: sandbag.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            id: Date.now() + Math.random()
          }])
        } else {
          remainingSandbags.push(sandbag)
        }
      })
      return remainingSandbags
    })

    // 碰撞检测 - Boss投射物击中玩家
    setBossProjectiles(prev => {
      const remainingProjectiles = []
      prev.forEach(projectile => {
        const hitPlayer = projectile.x < player.x + PLAYER_SIZE &&
                         projectile.x + 20 > player.x &&
                         projectile.y < player.y + PLAYER_SIZE &&
                         projectile.y + 20 > player.y

        if (hitPlayer) {
          setPlayerHealth(health => Math.max(0, health - 10))
        } else {
          remainingProjectiles.push(projectile)
        }
      })
      return remainingProjectiles
    })

    // 更新粒子效果
    setParticles(prev => prev.map(particle => ({
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      life: particle.life - 1
    })).filter(particle => particle.life > 0))

  }, [gameState, boss, player])

  // 检查游戏结束条件
  useEffect(() => {
    if (bossHealth <= 0) {
      setGameState('victory')
    } else if (playerHealth <= 0) {
      setGameState('defeat')
    }
  }, [bossHealth, playerHealth])

  // 游戏循环
  useEffect(() => {
    if (gameState === 'playing') {
      const loop = () => {
        gameLoop()
        animationRef.current = requestAnimationFrame(loop)
      }
      animationRef.current = requestAnimationFrame(loop)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, gameLoop])

  // 渲染游戏
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    if (gameState === 'playing') {
      // 绘制地面背景
      // 天空部分（上半部分）
      const skyHeight = GAME_HEIGHT * 0.3
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, GAME_WIDTH, skyHeight)
      
      // 地面部分（下半部分）
      ctx.fillStyle = '#8B7355' // 棕色土地
      ctx.fillRect(0, skyHeight, GAME_WIDTH, GAME_HEIGHT - skyHeight)
      
      // 草地纹理
      ctx.fillStyle = '#228B22'
      for (let x = 0; x < GAME_WIDTH; x += 20) {
        for (let y = skyHeight; y < skyHeight + 30; y += 5) {
          if (Math.random() > 0.7) {
            ctx.fillRect(x + Math.random() * 15, y, 2, 8)
          }
        }
      }

      // 绘制玩家
      ctx.fillStyle = '#4169E1'
      ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE)

      // 绘制Boss
      ctx.fillStyle = boss.isAttacking ? '#FF4500' : '#DC143C'
      ctx.fillRect(boss.x, boss.y, BOSS_SIZE, BOSS_SIZE)

      // 绘制沙包
      ctx.fillStyle = '#8B4513'
      sandbags.forEach(sandbag => {
        ctx.fillRect(sandbag.x, sandbag.y, SANDBAG_SIZE, SANDBAG_SIZE)
      })

      // 绘制Boss投射物
      ctx.fillStyle = '#FF6347'
      bossProjectiles.forEach(projectile => {
        ctx.beginPath()
        ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2)
        ctx.fill()
      })

      // 绘制粒子效果
      ctx.fillStyle = '#FFD700'
      particles.forEach(particle => {
        ctx.globalAlpha = particle.life / 30
        ctx.fillRect(particle.x, particle.y, 4, 4)
      })
      ctx.globalAlpha = 1

      // 绘制瞄准线
      if (isDragging) {
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2)
        ctx.lineTo(dragEnd.x, dragEnd.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  })

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    if (gameState !== 'playing') return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDragging(true)
    setDragStart({ x, y })
    setDragEnd({ x, y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || gameState !== 'playing') return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setDragEnd({ x, y })
  }

  const handleMouseUp = () => {
    if (!isDragging || gameState !== 'playing') return
    
    setIsDragging(false)
    
    // 计算从玩家位置到鼠标位置的方向和力度
    const playerCenterX = player.x + PLAYER_SIZE / 2
    const playerCenterY = player.y + PLAYER_SIZE / 2
    
    const dx = dragEnd.x - playerCenterX
    const dy = dragEnd.y - playerCenterY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 20) { // 最小拖拽距离
      // 归一化方向向量
      const normalizedDx = dx / distance
      const normalizedDy = dy / distance
      
      // 计算力度（基于拖拽距离，但有上限）
      const power = Math.min(distance / 15, 12)
      
      const vx = normalizedDx * power
      const vy = normalizedDy * power
      
      setSandbags(prev => [...prev, {
        x: playerCenterX,
        y: playerCenterY,
        vx,
        vy,
        id: Date.now()
      }])
    }
  }

  const startGame = () => {
    setGameState('playing')
    setPlayerHealth(100)
    setBossHealth(300)
    setScore(0)
    setSandbags([])
    setBossProjectiles([])
    setParticles([])
    setBoss({ 
      x: GAME_WIDTH - 150, 
      y: 100, 
      vx: 2, 
      vy: 1,
      attackTimer: 0,
      isAttacking: false
    })
  }

  const resetGame = () => {
    setGameState('menu')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8">丢沙包击败Boss</h1>
      
      {gameState === 'menu' && (
        <div className="text-center">
          <p className="text-white mb-4">拖拽鼠标来瞄准和投掷沙包，击败Boss！</p>
          <Button onClick={startGame} className="text-lg px-8 py-4">
            开始游戏
          </Button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center">
          <div className="flex gap-8 mb-4 text-white">
            <div>玩家血量: {playerHealth}</div>
            <div>Boss血量: {bossHealth}</div>
            <div>得分: {score}</div>
          </div>
          
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border-2 border-white cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          <p className="text-white mt-4 text-center">
            拖拽鼠标来瞄准和投掷沙包<br/>
            躲避Boss的攻击，击中Boss来造成伤害
          </p>
        </div>
      )}

      {gameState === 'victory' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-400 mb-4">胜利！</h2>
          <p className="text-white mb-4">最终得分: {score}</p>
          <div className="flex gap-4">
            <Button onClick={startGame}>再玩一次</Button>
            <Button onClick={resetGame} variant="outline">返回主菜单</Button>
          </div>
        </div>
      )}

      {gameState === 'defeat' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-red-400 mb-4">失败！</h2>
          <p className="text-white mb-4">最终得分: {score}</p>
          <div className="flex gap-4">
            <Button onClick={startGame}>再试一次</Button>
            <Button onClick={resetGame} variant="outline">返回主菜单</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

