const EditorMode = Object.freeze({
	Eye: "Eye",
	Box: "Box",
	Kill: "Kill",
	Spawnpoint: "Spawnpoint",
	Goal: "Goal",
	Coin: "Coin",
	Eraser: "Eraser",
	Simulating: "Simulating"
})

const PlayerInput = Object.freeze({
	None: "None",
	Left: "Left",
	Right: "Right",
	Jump: "Jump"
})

// visual configuration.
const TextColor = "#000000"
const TextFont = "16px monospace"
const BackgroundColor = "#f6f6f6"
const BoxColor = "#232323"
const HighlightColor = "#00e42360"
const SpawnColor = "#d30076"
const KillColor = "#520000"
const CoinColor = "#ffdd00"
const GoalColor = "#00ff4d"
const PlayerColor = "#ff0000"
const OutlineColor = "#4d4d4d"
const OutlineSize = 1

// gameplay configuration.
const TickMs = 10
const CameraSpeed = 5
const EyeRegionSize = 200
const PlayerWidth = 30
const PlayerHeight = 45
const CoinSize = 20
const Friction = 0.6
const Gravity = 0.1
const PlayerMoveAccel = 1.0
const PlayerJumpForce = 4.0
const MovesPerGen = 5
const BaseFitness = 1000
const CoinFitness = 5000
const GoalFitness = 100000
const LifetimeFitness = 1
const CoinDistanceFitness = 5000
const GoalDistanceFitness = 12000
const DeathFitness = -10000
const GoalSpeedFitness = 2000
const NoneChance = 0.25
const LeftChance = 0.30
const RightChance = 0.30
const JumpChance = 0.15
const MutationRamp = 0.9

// functional game state.
var Mode = EditorMode.Eye
var DragStartX = null
var DragStartY = null
var DragFinishX = null
var DragFinishY = null
var MouseX = 0
var MouseY = 0
var MouseDown = false
var CameraX = 0
var CameraY = 0
var SpawnX = 300
var SpawnY = 200
var CurPlayerMove = 0
var Generation = 0
var PopulationSize = 500
var MutationChance = 0.01
var Boxes = []
var Kills = []
var Goals = []
var Coins = []
var Players = []

// aesthetic game state.
var LivePopulation = 0
var BestFitness = 0

class Box
{
	constructor(x, y, w, h)
	{
		this.x = x
		this.y = y
		this.w = w
		this.h = h
	}
}

class Coin
{
	constructor(x, y)
	{
		this.x = x
		this.y = y
		this.CollectedBy = []
	}
}

class Player
{
	constructor(Id, x, y)
	{
		this.Id = Id
		this.PosX = x
		this.PosY = y
		this.VelX = 0.0
		this.VelY = 0.0
		this.Fitness = BaseFitness
		this.Memory = []
		this.Grounded = false
		this.Alive = true
		this.Active = true

		for (var i = 0; i < MovesPerGen; ++i)
			this.Memory.push(RandomPlayerInput(this))
	}
}

function BtnBox()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Box
}

function BtnCoin()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Coin
}

function BtnEraser()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Eraser
}

function BtnEye()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Eye
}

function BtnGoal()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Goal
}

function BtnKill()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Kill
}

function BtnKillAi()
{
	if (Mode != EditorMode.Simulating)
		return
	
	Mode = EditorMode.Eye

	// reset AI state.
	{
		Players = []
		for (var Coin of Coins)
			Coin.CollectedBy = []
	}
}

function BtnSetMutationChance()
{
	var Input = document.getElementById("InputMutationChance")

	if (Mode == EditorMode.Simulating)
	{
		Input.value = 100.0 * MutationChance
		return
	}

	var Value = parseFloat(Input.value)
	if (isNaN(Value))
	{
		Input.value = 100.0 * MutationChance
		return
	}

	if (Value < 0.0 || Value > 100.0)
	{
		Input.value = 100.0 * MutationChance
		return
	}

	MutationChance = Value / 100.0
}

function BtnSetPopulationSize()
{
	var Input = document.getElementById("InputPopulationSize")

	if (Mode == EditorMode.Simulating)
	{
		Input.value = PopulationSize
		return
	}

	var Value = parseInt(Input.value, 10)
	if (isNaN(Value))
	{
		Input.value = PopulationSize
		return
	}

	if (Value < 1 || Value > 1000)
	{
		Input.value = PopulationSize
		return
	}

	PopulationSize = Value
}

function BtnSpawnpoint()
{
	if (Mode == EditorMode.Simulating)
		return
	Mode = EditorMode.Spawnpoint
}

function BtnTrainAi()
{
	if (Mode == EditorMode.Simulating)
		return

	Mode = EditorMode.Simulating

	// setup base AI state.
	{
		CurPlayerMove = 0
		Generation = 1
		for (var i = 0; i < PopulationSize; ++i)
			Players.push(new Player(i, SpawnX, SpawnY))
	}

	LivePopulation = PopulationSize
}

function CurMutationRate()
{
	return Lerp(MutationChance * (1.0 - MutationRamp), MutationChance, CurPlayerMove / (Generation * MovesPerGen))
}

function Distance(X0, Y0, X1, Y1)
{
	return Math.sqrt((X1 - X0) * (X1 - X0) + (Y1 - Y0) * (Y1 - Y0))
}

function Draw()
{
	const Canvas = document.getElementById("MainCanvas")
	const Ctx = Canvas.getContext("2d")

	// fill background.
	{
		Ctx.fillStyle = BackgroundColor
		Ctx.fillRect(0, 0, Canvas.width, Canvas.height)
	}

	// draw game elements.
	{
		for (const Box of Boxes)
			DrawRelativeRect(Ctx, Box.x, Box.y, Box.w, Box.h, BoxColor)

		for (const Kill of Kills)
			DrawRelativeRect(Ctx, Kill.x, Kill.y, Kill.w, Kill.h, KillColor)

		for (const Coin of Coins)
			DrawRelativeRect(Ctx, Coin.x, Coin.y, CoinSize, CoinSize, CoinColor)

		for (const Goal of Goals)
			DrawRelativeRect(Ctx, Goal.x, Goal.y, Goal.w, Goal.h, GoalColor)

		DrawRelativeRect(Ctx, SpawnX, SpawnY, PlayerWidth, PlayerHeight, SpawnColor)

		for (const Player of Players)
		{
			if (Player.Alive)
				DrawRelativeRect(Ctx, Player.PosX, Player.PosY, PlayerWidth, PlayerHeight, PlayerColor)
		}
	}

	// draw mode-specific highlight indicators.
	switch (Mode)
	{
	case EditorMode.Box:
	case EditorMode.Kill:
	case EditorMode.Goal:
		if (DragStartX != null)
		{
			var StartX = DragStartX
			var StartY = DragStartY
			var CurX = MouseX
			var CurY = MouseY

			if (CurX < StartX)
			{
				var Tmp = CurX
				CurX = StartX
				StartX = Tmp
			}

			if (CurY < StartY)
			{
				var Tmp = CurY
				CurY = StartY
				StartY = Tmp
			}
			
			Ctx.fillStyle = HighlightColor
			Ctx.fillRect(StartX, StartY, CurX - StartX, CurY - StartY)
		}
		break
	case EditorMode.Spawnpoint:
		Ctx.fillStyle = HighlightColor
		Ctx.fillRect(MouseX, MouseY, PlayerWidth, PlayerHeight)
		break
	case EditorMode.Coin:
		Ctx.fillStyle = HighlightColor
		Ctx.fillRect(MouseX, MouseY, CoinSize, CoinSize)
		break
	default:
		break
	}

	// draw indicators and data.
	{
		Ctx.fillStyle = TextColor
		Ctx.font = TextFont
		Ctx.fillText("Mode: " + Mode, 10, 20)
		Ctx.fillText("Population size: " + LivePopulation + "/" + PopulationSize, 10, 40)
		Ctx.fillText("Mutation chance: " + (100 * MutationChance) + "%", 10, 60)
		Ctx.fillText("Generation: " + Generation, 10, 80)
		Ctx.fillText("Best fitness: " + Math.floor(BestFitness), 10, 100)
	}
}

function DrawRelativeRect(Ctx, x, y, w, h, Style)
{
	Ctx.fillStyle = OutlineColor
	Ctx.fillRect(
		x - CameraX - OutlineSize,
		y - CameraY - OutlineSize,
		w + 2 * OutlineSize,
		h + 2 * OutlineSize
	)

	Ctx.fillStyle = Style
	Ctx.fillRect(x - CameraX, y - CameraY, w, h)
}

function FinalizePlayerFitness(Player)
{
	// compute distance-based fitness.
	{
		const PlayerX = Player.PosX + PlayerWidth / 2
		const PlayerY = Player.PosY + PlayerHeight / 2

		for (const Coin of Coins)
		{
			if (Coin.CollectedBy.includes(Player.Id))
				continue

			const CoinX = Coin.x + CoinSize / 2
			const CoinY = Coin.y + CoinSize / 2

			Player.Fitness += CoinDistanceFitness / Distance(PlayerX, PlayerY, CoinX, CoinY)
		}

		for (const Goal of Goals)
		{
			const GoalX = Goal.x + Goal.w / 2
			const GoalY = Goal.y + Goal.h / 2

			Player.Fitness += GoalDistanceFitness / Distance(PlayerX, PlayerY, GoalX, GoalY)
		}
	}
}

function Init()
{
	// register button mode changes.
	{
		document.getElementById("BtnSetPopulationSize").onclick = BtnSetPopulationSize
		document.getElementById("BtnSetMutationChance").onclick = BtnSetMutationChance
		document.getElementById("BtnEye").onclick = BtnEye
		document.getElementById("BtnBox").onclick = BtnBox
		document.getElementById("BtnKill").onclick = BtnKill
		document.getElementById("BtnSpawnpoint").onclick = BtnSpawnpoint
		document.getElementById("BtnGoal").onclick = BtnGoal
		document.getElementById("BtnCoin").onclick = BtnCoin
		document.getElementById("BtnEraser").onclick = BtnEraser
		document.getElementById("BtnTrainAi").onclick = BtnTrainAi
		document.getElementById("BtnKillAi").onclick = BtnKillAi
	}

	// register mouse events.
	{
		document.getElementById("MainCanvas").addEventListener("mousedown", MouseDownEvent)
		document.getElementById("MainCanvas").addEventListener("mouseup", MouseUpEvent)
		document.getElementById("MainCanvas").addEventListener("mousemove", MouseMoveEvent)
		document.getElementById("MainCanvas").addEventListener("click", MouseClickEvent)
	}

	setInterval(Tick, TickMs)
}

function Lerp(a, b, t)
{
	return a + t * (b - a)
}

function MouseClickEvent()
{
	// handle mode-specific behavior.
	{
		switch (Mode)
		{
		case EditorMode.Spawnpoint:
			SpawnX = MouseX + CameraX
			SpawnY = MouseY + CameraY
			break
		case EditorMode.Coin:
			Coins.push(new Coin(
				MouseX + CameraX,
				MouseY + CameraY
			))
			break
		case EditorMode.Eraser:
		{
			const RelMouseX = MouseX + CameraX
			const RelMouseY = MouseY + CameraY

			const CollidesBox = i => i.x <= RelMouseX && i.x + i.w >= RelMouseX && i.y <= RelMouseY && i.y + i.h >= RelMouseY
			const RemnantBox = i => !CollidesBox(i)

			const CollidesCoin = i => i.x <= RelMouseX && i.x + CoinSize >= RelMouseX && i.y <= RelMouseY && i.y + CoinSize >= RelMouseY
			const RemnantCoin = i => !CollidesCoin(i)

			Boxes = Boxes.filter(RemnantBox)
			Kills = Kills.filter(RemnantBox)
			Goals = Goals.filter(RemnantBox)
			Coins = Coins.filter(RemnantCoin)

			break
		}
		default:
			break
		}
	}
}

function MouseDownEvent()
{
	DragFinishX = null
	DragFinishY = null
	DragStartX = MouseX
	DragStartY = MouseY
	MouseDown = true
}

function MouseMoveEvent(Event)
{
	MouseX = Event.offsetX
	MouseY = Event.offsetY
}

function MouseUpEvent()
{
	MouseDown = false

	if (DragStartX == null)
		return

	DragFinishX = MouseX
	DragFinishY = MouseY

	// handle invalid drag regions.
	{
		if (DragStartX > DragFinishX)
		{
			var Tmp = DragStartX
			DragStartX = DragFinishX
			DragFinishX = Tmp
		}

		if (DragStartY > DragFinishY)
		{
			var Tmp = DragStartY
			DragStartY = DragFinishY
			DragFinishY = Tmp
		}

		if (DragFinishX - DragStartX <= 0
		    || DragFinishY - DragStartY <= 0)
		{
			DragStartX = null
			DragStartY = null
			DragFinishX = null
			DragFinishY = null
			return
		}
	}

	// handle mode-specific mouse up functionality.
	{
		switch (Mode)
		{
		case EditorMode.Box:
			Boxes.push(new Box(
				DragStartX + CameraX,
				DragStartY + CameraY,
				DragFinishX - DragStartX,
				DragFinishY - DragStartY
			))
			break
		case EditorMode.Kill:
			Kills.push(new Box(
				DragStartX + CameraX,
				DragStartY + CameraY,
				DragFinishX - DragStartX,
				DragFinishY - DragStartY
			))
			break
		case EditorMode.Goal:
			Goals.push(new Box(
				DragStartX + CameraX,
				DragStartY + CameraY,
				DragFinishX - DragStartX,
				DragFinishY - DragStartY
			))
			break
		default:
			break
		}
	}

	DragStartX = null
	DragStartY = null
	DragFinishX = null
	DragFinishY = null
}

function MutatePlayer(Player)
{
	const MutRate = CurMutationRate()

	for (var i = 0; i < Player.Memory.length; ++i)
	{
		if (Math.random() < MutRate)
			Player.Memory[i] = RandomPlayerInput(Player)
	}
}

function PropagatePlayers()
{
	// find fittest player.
	var Fittest = Players[0]
	{
		BestFitness = 0
		for (const Player of Players)
		{
			if (Player.Fitness > BestFitness)
			{
				Fittest = Player
				BestFitness = Player.Fitness
			}
		}
	}

	// create new generation.
	{
		var FittestMemory = Fittest.Memory.slice()
		for (var i = 0; i < Players.length; ++i)
		{
			Players[i] = new Player(i, SpawnX, SpawnY)
			Players[i].Memory = FittestMemory.slice()
			MutatePlayer(Players[i])

			for (var j = 0; j < MovesPerGen; ++j)
				Players[i].Memory.push(RandomPlayerInput(Players[i]))
		}
	}

	LivePopulation = PopulationSize
}

function RandomPlayerInput(Player)
{
	const PlayerInputs = [
		PlayerInput.None,
		PlayerInput.Left,
		PlayerInput.Right,
		PlayerInput.Jump
	]

	const Weights = [
		NoneChance,
		LeftChance,
		RightChance,
		JumpChance
	]

	return WeightedRandom(PlayerInputs, Weights)
}

function Tick()
{
	// handle mode-specific functionality.
	{
		switch (Mode)
		{
		case EditorMode.Eye:
		case EditorMode.Simulating:
		{
			const Canvas = document.getElementById("MainCanvas")

			if (MouseDown && MouseX > Canvas.width - EyeRegionSize)
				CameraX += CameraSpeed
			else if (MouseDown && MouseX < EyeRegionSize)
				CameraX -= CameraSpeed

			if (MouseDown && MouseY > Canvas.height - EyeRegionSize)
				CameraY += CameraSpeed
			else if (MouseDown && MouseY < EyeRegionSize)
				CameraY -= CameraSpeed

			break
		}
		default:
			break
		}
	}

	// update game.
	{
		if (Mode == EditorMode.Simulating)
		{
			for (var Player of Players)
				UpdatePlayer(Player)

			++CurPlayerMove
			if (CurPlayerMove == MovesPerGen * Generation)
			{
				for (var Player of Players)
					FinalizePlayerFitness(Player)

				for (var i = 0; i < Coins.length; ++i)
					Coins[i].CollectedBy = []

				PropagatePlayers()
				++Generation
				CurPlayerMove = 0
			}
		}
	}

	Draw()
}

function UpdatePlayer(Player)
{
	if (!Player.Alive || !Player.Active)
		return

	// apply forces.
	{
		Player.VelY += Gravity
		if (Player.Grounded)
			Player.VelX *= Friction
	}

	// move based on memory.
	{
		switch (Player.Memory[CurPlayerMove])
		{
		case PlayerInput.Left:
			if (Player.Grounded)
				Player.VelX -= PlayerMoveAccel
			break
		case PlayerInput.Right:
			if (Player.Grounded)
				Player.VelX += PlayerMoveAccel
			break
		case PlayerInput.Jump:
			if (Player.Grounded)
				Player.VelY -= PlayerJumpForce
			break
		default:
			break
		}
	}

	// handle collision.
	{
		Player.Grounded = false
		for (const Box of Boxes)
		{
			if (Player.PosY + PlayerHeight >= Box.y
				&& Player.PosY <= Box.y + Box.h)
			{
				if (Player.PosX <= Box.x
					&& Player.PosX + PlayerWidth + Player.VelX >= Box.x)
				{
					Player.PosX = Box.x - PlayerWidth - 0.5
					Player.VelX = 0
				}
				else if (Player.PosX + PlayerWidth >= Box.x + Box.w
					&& Player.PosX + Player.VelX <= Box.x + Box.w)
				{
					Player.PosX = Box.x + Box.w + 0.5
					Player.VelX = 0
				}
			}

			if (Player.PosX + PlayerWidth >= Box.x
				&& Player.PosX <= Box.x + Box.w)
			{
				if (Player.PosY <= Box.y
					&& Player.PosY + PlayerHeight + Player.VelY >= Box.y)
				{
					Player.PosY = Box.y - PlayerHeight - 0.5
					Player.VelY = 0
					Player.Grounded = true
				}
				else if (Player.PosY + PlayerHeight >= Box.y + Box.h
					&& Player.PosY + Player.VelY <= Box.y + Box.h)
				{
					Player.PosY = Box.y + Box.h + 0.5
					Player.VelY = 0
				}
			}
		}

		for (const Kill of Kills)
		{
			if (Player.PosY + PlayerHeight >= Kill.y
				&& Player.PosY <= Kill.y + Kill.h
				&& Player.PosX + PlayerWidth >= Kill.x
				&& Player.PosX <= Kill.x + Kill.w)
			{
				Player.Fitness += DeathFitness
				Player.Alive = false
				--LivePopulation
				return
			}
		}

		for (const Goal of Goals)
		{
			if (Player.PosY + PlayerHeight >= Goal.y
				&& Player.PosY <= Goal.y + Goal.h
				&& Player.PosX + PlayerWidth >= Goal.x
				&& Player.PosX <= Goal.x + Goal.w)
			{
				Player.Fitness += GoalFitness
				Player.Fitness += GoalSpeedFitness * (Generation * MovesPerGen) / CurPlayerMove
				Player.Active = false
				return
			}
		}

		for (var Coin of Coins)
		{
			if (Player.PosY + PlayerHeight >= Coin.y
				&& Player.PosY <= Coin.y + CoinSize
				&& Player.PosX + PlayerWidth >= Coin.x
				&& Player.PosX <= Coin.x + CoinSize
				&& !Coin.CollectedBy.includes(Player.Id))
			{
				Player.Fitness += CoinFitness
				Coin.CollectedBy.push(Player.Id)
			}
		}
	}

	// actually move player.
	{
		Player.PosX += Player.VelX
		Player.PosY += Player.VelY
	}

	Player.Fitness += LifetimeFitness
}

function WeightedRandom(Items, Weights)
{
	var i

	for (i = 1; i < Weights.length; ++i)
		Weights[i] += Weights[i - 1]

	var Rand = Math.random() * Weights[Weights.length - 1]

	for (i = 0; i < Weights.length; ++i)
	{
		if (Weights[i] > Rand)
			break
	}

	return Items[i]
}

window.onload = Init
