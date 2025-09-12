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
  const [player, setPlayer] = useState({ x: 50, y: GAME_HEIGHT - 80 }) // 玩家在左侧地面上
  const [enemies, setEnemies] = useState([{ 
    id: 1,
    x: GAME_WIDTH - 150, 
    y: GAME_HEIGHT - 120, // 敌人在地面上
    vx: 1, 
    vy: 0.5, // 减小移动速度
    attackTimer: 0,
    isAttacking: false,
    health: 300
  }])
  const [gameTimer, setGameTimer] = useState(0) // 游戏计时器
  const [sandbags, setSandbags] = useState([])
  const [bossProjectiles, setBossProjectiles] = useState([])
  const [particles, setParticles] = useState([])
  const [sandbagCooldown, setSandbagCooldown] = useState(0) // 沙包冷却时间
  const [ultimatePoints, setUltimatePoints] = useState(0) // 大招点数
  const [ultimateCooldown, setUltimateCooldown] = useState(0) // 大招冷却时间

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return

    // 更新游戏计时器
    setGameTimer(prev => prev + 1)

    // 更新沙包冷却时间
    setSandbagCooldown(prev => Math.max(0, prev - 1))

    // 更新大招冷却时间
    setUltimateCooldown(prev => Math.max(0, prev - 1))

    // 每10秒（600帧）生成一个新敌人
    if (gameTimer > 0 && gameTimer % 600 === 0) {
      setEnemies(prev => [...prev, {
        id: Date.now(),
        x: GAME_WIDTH - 100 - Math.random() * 200, // 随机位置
        y: GAME_HEIGHT - 120 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        attackTimer: Math.random() * 60, // 随机攻击时机
        isAttacking: false,
        health: 300
      }])
    }

    // 更新所有敌人位置
    setEnemies(prev => prev.map(enemy => {
      let newX = enemy.x + enemy.vx
      let newY = enemy.y + enemy.vy
      let newVx = enemy.vx
      let newVy = enemy.vy

      // 敌人边界检测（限制在地面区域）
      if (newX <= 0 || newX >= GAME_WIDTH - BOSS_SIZE) {
        newVx = -newVx
      }
      if (newY <= GAME_HEIGHT - 200 || newY >= GAME_HEIGHT - BOSS_SIZE) { // 限制在地面附近
        newVy = -newVy
      }

      // 敌人攻击逻辑
      let attackTimer = enemy.attackTimer + 1
      let isAttacking = enemy.isAttacking

      if (attackTimer > 120 && !isAttacking) { // 每2秒攻击一次
        isAttacking = true
        attackTimer = 0
        
        // 发射追踪玩家的投射物
        const dx = player.x - newX
        const dy = player.y - newY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 2
        
        setBossProjectiles(projectiles => [...projectiles, {
          x: newX + BOSS_SIZE / 2,
          y: newY + BOSS_SIZE,
          vx: (dx / distance) * speed,
          vy: (dy / distance) * speed,
          id: Date.now() + Math.random(),
          isTracking: true // 标记为追踪投掷物
        }])
      }

      if (isAttacking && attackTimer > 30) {
        isAttacking = false
      }

      return {
        ...enemy,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        attackTimer,
        isAttacking
      }
    }))

    // 更新沙包位置
    setSandbags(prev => prev.map(sandbag => {
      // 计算速度衰减（模拟空气阻力/摩擦力）
      const friction = 0.98 // 摩擦系数，越小减速越快
      const newVx = sandbag.vx * friction
      const newVy = sandbag.vy * friction
      
      // 当速度很小时，停止移动
      const minSpeed = 0.1
      const finalVx = Math.abs(newVx) < minSpeed ? 0 : newVx
      const finalVy = Math.abs(newVy) < minSpeed ? 0 : newVy
      
      return {
        ...sandbag,
        x: sandbag.x + finalVx,
        y: sandbag.y + finalVy,
        vx: finalVx,
        vy: finalVy
      }
    }).filter(sandbag => {
      // 移除静止的沙包或超出边界的沙包
      const isStationary = Math.abs(sandbag.vx) < 0.1 && Math.abs(sandbag.vy) < 0.1
      const isOutOfBounds = sandbag.x < -SANDBAG_SIZE || 
                           sandbag.x > GAME_WIDTH + SANDBAG_SIZE || 
                           sandbag.y < -SANDBAG_SIZE || 
                           sandbag.y > GAME_HEIGHT + SANDBAG_SIZE
      
      // 保留移动中且在边界内的沙包
      return !isStationary && !isOutOfBounds
    }))

    // 更新Boss投射物（追踪玩家）
    setBossProjectiles(prev => prev.map(projectile => {
      if (projectile.isTracking) {
        // 计算朝向玩家的方向
        const dx = player.x - projectile.x
        const dy = player.y - projectile.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0) {
          const speed = 2.5 // 追踪速度
          const newVx = (dx / distance) * speed
          const newVy = (dy / distance) * speed
          
          return {
            ...projectile,
            x: projectile.x + newVx,
            y: projectile.y + newVy,
            vx: newVx,
            vy: newVy
          }
        }
      }
      
      // 非追踪投掷物保持原有逻辑
      return {
        ...projectile,
        x: projectile.x + projectile.vx,
        y: projectile.y + projectile.vy
      }
    }).filter(projectile => 
      projectile.x > -20 && 
      projectile.x < GAME_WIDTH + 20 && 
      projectile.y > -20 && 
      projectile.y < GAME_HEIGHT + 20
    ))

    // 碰撞检测 - 沙包击中敌人
    setSandbags(prev => {
      const remainingSandbags = []
      prev.forEach(sandbag => {
        let hitEnemy = false
        
        setEnemies(enemies => enemies.map(enemy => {
          const hit = sandbag.x < enemy.x + BOSS_SIZE &&
                     sandbag.x + SANDBAG_SIZE > enemy.x &&
                     sandbag.y < enemy.y + BOSS_SIZE &&
                     sandbag.y + SANDBAG_SIZE > enemy.y

          if (hit && !hitEnemy) {
            hitEnemy = true
            setScore(score => score + 100)
            setUltimatePoints(points => points + 1) // 击中敌人获得大招点数
            
            // 添加击中特效
            setParticles(particles => [...particles, {
              x: sandbag.x,
              y: sandbag.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 30,
              id: Date.now() + Math.random()
            }])
            
            // 减少敌人血量
            const newHealth = enemy.health - 20
            if (newHealth <= 0) {
              setScore(score => score + 500) // 击败敌人额外奖励
              setUltimatePoints(points => points + 3) // 击败敌人获得更多大招点数
              return null // 标记为删除
            }
            return { ...enemy, health: newHealth }
          }
          return enemy
        }).filter(enemy => enemy !== null)) // 移除被击败的敌人

        if (!hitEnemy) {
          remainingSandbags.push(sandbag)
        }
      })
      return remainingSandbags
    })

    // 碰撞检测 - 玩家沙包抵挡敌人投掷物
    setSandbags(prev => {
      const remainingSandbags = []
      prev.forEach(sandbag => {
        let hitProjectile = false
        
        setBossProjectiles(projectiles => {
          const remainingProjectiles = []
          projectiles.forEach(projectile => {
            const collision = sandbag.x < projectile.x + 20 &&
                             sandbag.x + SANDBAG_SIZE > projectile.x &&
                             sandbag.y < projectile.y + 20 &&
                             sandbag.y + SANDBAG_SIZE > projectile.y

            if (collision && !hitProjectile) {
              hitProjectile = true
              setScore(score => score + 50) // 抵挡奖励
              setUltimatePoints(points => points + 1) // 抵挡也获得大招点数
              
              // 添加抵挡特效
              setParticles(particles => [...particles, {
                x: (sandbag.x + projectile.x) / 2,
                y: (sandbag.y + projectile.y) / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 20,
                id: Date.now() + Math.random()
              }])
            } else {
              remainingProjectiles.push(projectile)
            }
          })
          return remainingProjectiles
        })

        if (!hitProjectile) {
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

  }, [gameState, enemies, player, gameTimer, sandbagCooldown, ultimatePoints, ultimateCooldown])

  // 检查游戏结束条件
  useEffect(() => {
    if (enemies.length === 0 && gameTimer > 60) { // 如果所有敌人都被击败
      setGameState('victory')
    } else if (playerHealth <= 0) {
      setGameState('defeat')
    }
  }, [enemies, playerHealth, gameTimer])

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
      // 绘制地面背景（整个区域）
      ctx.fillStyle = '#8B7355' // 棕色土地
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      
      // 添加草地纹理遍布整个区域
      ctx.fillStyle = '#228B22'
      for (let x = 0; x < GAME_WIDTH; x += 25) {
        for (let y = 0; y < GAME_HEIGHT; y += 25) {
          if (Math.random() > 0.6) {
            ctx.fillRect(x + Math.random() * 20, y + Math.random() * 20, 3, 10)
          }
        }
      }
      
      // 添加一些土地纹理点
      ctx.fillStyle = '#654321'
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * GAME_WIDTH
        const y = Math.random() * GAME_HEIGHT
        ctx.fillRect(x, y, 2, 2)
      }

      // 绘制玩家（向前看的角色）
      ctx.fillStyle = '#4169E1'
      // 身体
      ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE)
      // 头部（向前看）
      ctx.fillStyle = '#FFE4C4'
      ctx.fillRect(player.x + 5, player.y - 15, PLAYER_SIZE - 10, 15)
      // 眼睛（表示向前看）
      ctx.fillStyle = '#000000'
      ctx.fillRect(player.x + 8, player.y - 10, 3, 3)
      ctx.fillRect(player.x + 15, player.y - 10, 3, 3)
      // 手臂（准备投掷姿势）
      ctx.fillStyle = '#FFE4C4'
      ctx.fillRect(player.x - 8, player.y + 10, 15, 8)
      ctx.fillRect(player.x + PLAYER_SIZE - 7, player.y + 10, 15, 8)

      // 绘制所有敌人（向前看的角色）
      enemies.forEach(enemy => {
        ctx.fillStyle = enemy.isAttacking ? '#FF4500' : '#DC143C'
        // 敌人身体
        ctx.fillRect(enemy.x, enemy.y, BOSS_SIZE, BOSS_SIZE)
        // 敌人头部（向前看）
        ctx.fillStyle = '#8B0000'
        ctx.fillRect(enemy.x + 10, enemy.y - 20, BOSS_SIZE - 20, 20)
        // 敌人眼睛（红色，表示愤怒）
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(enemy.x + 15, enemy.y - 15, 5, 5)
        ctx.fillRect(enemy.x + 25, enemy.y - 15, 5, 5)
        // 敌人手臂
        ctx.fillStyle = '#8B0000'
        ctx.fillRect(enemy.x - 15, enemy.y + 20, 20, 12)
        ctx.fillRect(enemy.x + BOSS_SIZE - 5, enemy.y + 20, 20, 12)
        
        // 绘制敌人血量条
        const healthBarWidth = BOSS_SIZE
        const healthBarHeight = 6
        const healthPercentage = enemy.health / 300
        
        // 血量条背景
        ctx.fillStyle = '#333333'
        ctx.fillRect(enemy.x, enemy.y - 30, healthBarWidth, healthBarHeight)
        
        // 血量条
        ctx.fillStyle = healthPercentage > 0.5 ? '#00FF00' : healthPercentage > 0.25 ? '#FFFF00' : '#FF0000'
        ctx.fillRect(enemy.x, enemy.y - 30, healthBarWidth * healthPercentage, healthBarHeight)
      })

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
    
    if (distance > 20 && sandbagCooldown === 0) { // 最小拖拽距离且无冷却时间
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
      
      // 设置冷却时间（2秒 = 120帧）
      setSandbagCooldown(120)
    }
  }

  const startGame = () => {
    setGameState('playing')
    setPlayerHealth(100)
    setScore(0)
    setGameTimer(0)
    setSandbagCooldown(0) // 重置冷却时间
    setUltimatePoints(0) // 重置大招点数
    setUltimateCooldown(0) // 重置大招冷却
    setSandbags([])
    setBossProjectiles([])
    setParticles([])
    setEnemies([{ 
      id: 1,
      x: GAME_WIDTH - 150, 
      y: GAME_HEIGHT - 120, // 敌人在地面上
      vx: 1, 
      vy: 0.5, // 减小移动速度
      attackTimer: 0,
      isAttacking: false,
      health: 300
    }])
  }

  // 大招功能：清除所有敌人投掷物并对所有敌人造成伤害
  const useUltimate = () => {
    if (ultimatePoints >= 10 && ultimateCooldown === 0) {
      setUltimatePoints(points => points - 10) // 消耗10点大招点数
      setUltimateCooldown(600) // 10秒冷却时间
      
      // 清除所有敌人投掷物
      setBossProjectiles([])
      
      // 对所有敌人造成大量伤害
      setEnemies(prev => prev.map(enemy => {
        const newHealth = enemy.health - 100
        if (newHealth <= 0) {
          setScore(score => score + 1000) // 大招击败敌人额外奖励
          return null
        }
        return { ...enemy, health: newHealth }
      }).filter(enemy => enemy !== null))
      
      // 添加大招特效
      setParticles(particles => {
        const newParticles = []
        for (let i = 0; i < 50; i++) {
          newParticles.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 60,
            id: Date.now() + Math.random() + i
          })
        }
        return [...particles, ...newParticles]
      })
    }
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
            <div>敌人数量: {enemies.length}</div>
            <div>得分: {score}</div>
            <div>时间: {Math.floor(gameTimer / 60)}秒</div>
            <div className={sandbagCooldown > 0 ? 'text-red-400' : 'text-green-400'}>
              沙包: {sandbagCooldown > 0 ? `冷却中(${Math.ceil(sandbagCooldown / 60)}s)` : '就绪'}
            </div>
            <div className={ultimatePoints >= 10 ? 'text-yellow-400' : 'text-gray-400'}>
              大招点数: {ultimatePoints}/10
            </div>
          </div>
          
          <div className="mb-4">
            <Button 
              onClick={useUltimate} 
              disabled={ultimatePoints < 10 || ultimateCooldown > 0}
              className={`px-6 py-2 ${ultimatePoints >= 10 && ultimateCooldown === 0 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600'}`}
            >
              {ultimateCooldown > 0 ? `大招冷却中(${Math.ceil(ultimateCooldown / 60)}s)` : 
               ultimatePoints >= 10 ? '释放大招' : `大招(${ultimatePoints}/10)`}
            </Button>
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

