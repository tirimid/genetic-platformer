const EditorMode = Object.freeze({
	Eye: 0,
	Boxdraw: 1,
	Spawnpoint: 2,
	Goal: 3,
	Coin: 4
})

// gameplay configuration.
const TickMs = 10;

// visual configuration.
const BackgroundColor = "#f6f6f6"

// game state.
var Mode = EditorMode.Eye
var DragStartX = null
var DragStartY = null
var DragFinishX = null
var DragFinishY = null

function BtnBoxdraw()
{
	Mode = EditorMode.Boxdraw
}

function BtnCoin()
{
	Mode = EditorMode.Coin
}

function BtnEye()
{
	Mode = EditorMode.Eye
}

function BtnGoal()
{
	Mode = EditorMode.Goal
}

function BtnSpawnpoint()
{
	Mode = EditorMode.Spawnpoint
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
}

function Init()
{
	// register button mode changes.
	{
		document.getElementById("BtnEye").onclick = BtnEye
		document.getElementById("BtnBoxdraw").onclick = BtnBoxdraw
		document.getElementById("BtnSpawnpoint").onclick = BtnSpawnpoint
		document.getElementById("BtnGoal").onclick = BtnGoal
		document.getElementById("BtnCoin").onclick = BtnCoin
	}

	// register mouse events.
	{
		document.getElementById("MainCanvas").addEventListener("mousedown", MouseDownEvent)
		document.getElementById("MainCanvas").addEventListener("mouseup", MouseUpEvent)
	}

	setInterval(Tick, TickMs)
}

function MouseDownEvent()
{
	console.log("mouse down")
}

function MouseUpEvent()
{
	console.log("mouse up")
}

function Tick()
{
	Draw()
}

window.onload = Init
