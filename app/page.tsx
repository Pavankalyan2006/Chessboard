"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Chess } from "chess.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, Play, RotateCcw, Square } from "lucide-react"

const PIECE_SYMBOLS = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
}

interface GameState {
  isStarted: boolean
  whiteTime: number
  blackTime: number
  initialTime: number
}

export default function ChessGame() {
  const [game, setGame] = useState(new Chess())
  const [whiteMoveInput, setWhiteMoveInput] = useState("")
  const [blackMoveInput, setBlackMoveInput] = useState("")
  const [whiteError, setWhiteError] = useState("")
  const [blackError, setBlackError] = useState("")
  const [whiteMoveHistory, setWhiteMoveHistory] = useState<string[]>([])
  const [blackMoveHistory, setBlackMoveHistory] = useState<string[]>([])
  const [gameStatus, setGameStatus] = useState("")
  const [timeInput, setTimeInput] = useState("10")
  const [gameState, setGameState] = useState<GameState>({
    isStarted: false,
    whiteTime: 600, // 10 minutes in seconds
    blackTime: 600,
    initialTime: 600,
  })
  const [gameQuit, setGameQuit] = useState<{ player: string; reason: string } | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    updateGameStatus()
  }, [game])

  useEffect(() => {
    if (gameState.isStarted && !game.isGameOver()) {
      intervalRef.current = setInterval(() => {
        setGameState((prev) => {
          const newState = { ...prev }
          if (game.turn() === "w") {
            newState.whiteTime = Math.max(0, prev.whiteTime - 1)
            if (newState.whiteTime === 0) {
              setGameStatus("Time's up! Black wins!")
              return newState
            }
          } else {
            newState.blackTime = Math.max(0, prev.blackTime - 1)
            if (newState.blackTime === 0) {
              setGameStatus("Time's up! White wins!")
              return newState
            }
          }
          return newState
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [gameState.isStarted, game, game.turn()])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const updateGameStatus = () => {
    if (gameState.whiteTime === 0) {
      setGameStatus("Time's up! Black wins!")
      return
    }
    if (gameState.blackTime === 0) {
      setGameStatus("Time's up! White wins!")
      return
    }

    if (game.isCheckmate()) {
      setGameStatus(`Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`)
    } else if (game.isDraw()) {
      if (game.isStalemate()) {
        setGameStatus("Draw by stalemate")
      } else if (game.isThreefoldRepetition()) {
        setGameStatus("Draw by threefold repetition")
      } else if (game.isInsufficientMaterial()) {
        setGameStatus("Draw by insufficient material")
      } else {
        setGameStatus("Draw by 50-move rule")
      }
    } else if (game.isCheck()) {
      setGameStatus(`${game.turn() === "w" ? "White" : "Black"} is in check`)
    } else {
      setGameStatus(`${game.turn() === "w" ? "White" : "Black"} to move`)
    }
  }

  const startGame = () => {
    const minutes = Number.parseInt(timeInput) || 10
    const seconds = minutes * 60
    setGameState({
      isStarted: true,
      whiteTime: seconds,
      blackTime: seconds,
      initialTime: seconds,
    })
  }

  const makeMove = (isWhite: boolean) => {
    const currentPlayer = game.turn() === "w"
    if (currentPlayer !== isWhite) return

    const moveInput = isWhite ? whiteMoveInput : blackMoveInput
    const setError = isWhite ? setWhiteError : setBlackError
    const setMoveInput = isWhite ? setWhiteMoveInput : setBlackMoveInput

    setError("")

    if (!moveInput.trim()) {
      setError("Please enter a move")
      return
    }

    try {
      let move
      const input = moveInput.trim().toLowerCase()

      if (input.length <= 5 && !input.includes(" ")) {
        move = game.move(input)
      } else {
        const coords = input.replace("-", " ").split(/\s+/)
        if (coords.length === 2) {
          move = game.move({
            from: coords[0],
            to: coords[1],
          })
        } else {
          throw new Error("Invalid move format")
        }
      }

      if (move) {
        if (isWhite) {
          setWhiteMoveHistory((prev) => [...prev, move.san])
        } else {
          setBlackMoveHistory((prev) => [...prev, move.san])
        }
        setMoveInput("")
        setGame(new Chess(game.fen()))
        updateGameStatus()
      }
    } catch (err) {
      setError("Invalid move. Please check your input and try again.")
    }
  }

  const undoMove = () => {
    if (whiteMoveHistory.length === 0 && blackMoveHistory.length === 0) return

    const newGame = new Chess()
    let newWhiteHistory = [...whiteMoveHistory]
    let newBlackHistory = [...blackMoveHistory]

    // Remove the last move
    if (blackMoveHistory.length > whiteMoveHistory.length) {
      newBlackHistory = newBlackHistory.slice(0, -1)
    } else {
      newWhiteHistory = newWhiteHistory.slice(0, -1)
    }

    // Replay all moves
    const maxMoves = Math.max(newWhiteHistory.length, newBlackHistory.length)
    for (let i = 0; i < maxMoves; i++) {
      if (i < newWhiteHistory.length) {
        newGame.move(newWhiteHistory[i])
      }
      if (i < newBlackHistory.length) {
        newGame.move(newBlackHistory[i])
      }
    }

    setGame(newGame)
    setWhiteMoveHistory(newWhiteHistory)
    setBlackMoveHistory(newBlackHistory)
    setWhiteError("")
    setBlackError("")
    updateGameStatus()
  }

  const resetGame = () => {
    setGame(new Chess())
    setWhiteMoveHistory([])
    setBlackMoveHistory([])
    setWhiteMoveInput("")
    setBlackMoveInput("")
    setWhiteError("")
    setBlackError("")
    setGameState({
      isStarted: false,
      whiteTime: 600,
      blackTime: 600,
      initialTime: 600,
    })
    setGameQuit(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    updateGameStatus()
  }

  const quitGame = (player: "white" | "black") => {
    setGameQuit({
      player: player === "white" ? "White" : "Black",
      reason: "quit",
    })
    setGameStatus(
      `${player === "white" ? "White" : "Black"} player quit the game. ${player === "white" ? "Black" : "White"} wins!`,
    )
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, isWhite: boolean) => {
    if (e.key === "Enter") {
      makeMove(isWhite)
    }
  }

  const renderSquare = (square: string, piece: any) => {
    const file = square.charCodeAt(0) - 97
    const rank = Number.parseInt(square[1]) - 1
    const isLight = (file + rank) % 2 === 0

    return (
      <div
        key={square}
        className={`
          aspect-square flex items-center justify-center text-4xl font-bold cursor-pointer
          ${isLight ? "bg-amber-100" : "bg-amber-800"}
          hover:opacity-80 transition-opacity
        `}
      >
        {piece
          ? PIECE_SYMBOLS[
              piece.type === "p"
                ? piece.color === "w"
                  ? "P"
                  : "p"
                : piece.type === "r"
                  ? piece.color === "w"
                    ? "R"
                    : "r"
                  : piece.type === "n"
                    ? piece.color === "w"
                      ? "N"
                      : "n"
                    : piece.type === "b"
                      ? piece.color === "w"
                        ? "B"
                        : "b"
                      : piece.type === "q"
                        ? piece.color === "w"
                          ? "Q"
                          : "q"
                        : piece.type === "k"
                          ? piece.color === "w"
                            ? "K"
                            : "k"
                          : ""
            ]
          : ""}
      </div>
    )
  }

  const renderBoard = () => {
    const board = game.board()
    const squares = []

    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (rank + 1)
        const piece = board[rank][file]
        squares.push(renderSquare(square, piece))
      }
    }

    return squares
  }

  const isGameOver = game.isGameOver() || gameState.whiteTime === 0 || gameState.blackTime === 0 || gameQuit !== null

  if (!gameState.isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Clock className="w-6 h-6" />
              Setup Chess Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time per player (minutes):</label>
              <Input
                type="number"
                min="1"
                max="60"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="Enter minutes"
              />
            </div>
            <Button onClick={startGame} className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Interactive Chess</h1>
          <p className="text-slate-600">Two-player chess with individual timers</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* White Player Controls */}
          <div className="space-y-4">
            <Card className={`${game.turn() === "w" ? "ring-2 ring-blue-500" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Square className="w-5 h-5 fill-white stroke-black" />
                    White Player
                  </span>
                  <Badge variant={game.turn() === "w" ? "default" : "secondary"}>
                    {game.turn() === "w" ? "Your Turn" : "Waiting"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div
                    className={`text-2xl font-mono font-bold ${gameState.whiteTime < 60 ? "text-red-500" : "text-green-600"}`}
                  >
                    {formatTime(gameState.whiteTime)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="e.g., e2 e4 or e4"
                    value={whiteMoveInput}
                    onChange={(e) => setWhiteMoveInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, true)}
                    disabled={game.turn() !== "w" || isGameOver}
                  />
                  <Button
                    onClick={() => makeMove(true)}
                    disabled={game.turn() !== "w" || isGameOver}
                    className="w-full"
                  >
                    Make Move
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => quitGame("white")}
                    disabled={isGameOver}
                    className="w-full"
                  >
                    Quit Game
                  </Button>
                </div>

                {whiteError && (
                  <Alert variant="destructive">
                    <AlertDescription>{whiteError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* White Move History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">White Moves</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {whiteMoveHistory.length === 0 ? (
                    <p className="text-slate-500 text-sm">No moves yet</p>
                  ) : (
                    <div className="space-y-1">
                      {whiteMoveHistory.map((move, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 w-6">{index + 1}.</span>
                          <span className="font-mono">{move}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chessboard */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">{gameStatus}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-8 gap-0 border-4 border-amber-900 max-w-lg mx-auto">{renderBoard()}</div>

                <div className="max-w-lg mx-auto mt-2">
                  <div className="grid grid-cols-8 text-center text-sm text-slate-600">
                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((file) => (
                      <div key={file}>{file}</div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={undoMove}
                    disabled={whiteMoveHistory.length === 0 && blackMoveHistory.length === 0}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                  <Button variant="secondary" onClick={resetGame}>
                    New Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Black Player Controls */}
          <div className="space-y-4">
            <Card className={`${game.turn() === "b" ? "ring-2 ring-blue-500" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Square className="w-5 h-5 fill-black" />
                    Black Player
                  </span>
                  <Badge variant={game.turn() === "b" ? "default" : "secondary"}>
                    {game.turn() === "b" ? "Your Turn" : "Waiting"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div
                    className={`text-2xl font-mono font-bold ${gameState.blackTime < 60 ? "text-red-500" : "text-green-600"}`}
                  >
                    {formatTime(gameState.blackTime)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="e.g., e7 e5 or e5"
                    value={blackMoveInput}
                    onChange={(e) => setBlackMoveInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, false)}
                    disabled={game.turn() !== "b" || isGameOver}
                  />
                  <Button
                    onClick={() => makeMove(false)}
                    disabled={game.turn() !== "b" || isGameOver}
                    className="w-full"
                  >
                    Make Move
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => quitGame("black")}
                    disabled={isGameOver}
                    className="w-full"
                  >
                    Quit Game
                  </Button>
                </div>

                {blackError && (
                  <Alert variant="destructive">
                    <AlertDescription>{blackError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Black Move History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Black Moves</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {blackMoveHistory.length === 0 ? (
                    <p className="text-slate-500 text-sm">No moves yet</p>
                  ) : (
                    <div className="space-y-1">
                      {blackMoveHistory.map((move, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500 w-6">{index + 1}...</span>
                          <span className="font-mono">{move}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Play</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Coordinate notation:</strong>
              <br />
              e2 e4, g1 f3, e1 g1 (castling)
            </div>
            <div>
              <strong>Algebraic notation:</strong>
              <br />
              e4, Nf3, O-O (kingside castling)
            </div>
            <div>
              <strong>Special moves:</strong>
              <br />
              O-O (kingside), O-O-O (queenside)
              <br />
              e7 e8=Q (pawn promotion)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
