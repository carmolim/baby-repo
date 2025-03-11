//======= CONFIGURATION =======//
const BABY_BUDDY_SERVER = ""
const API_TOKEN = "" 
const DAILY_GOAL_ML = 240
const CHILD_ID = 1

// Color configuration
const PROGRESS_COLORS = {
  background: new Color("#e5e5ea", 0.5), // Light gray with transparency
  progress: new Color("#34c759"), // iOS green
  warning: new Color("#ff9500"), // iOS orange
  danger: new Color("#ff3b30"), // iOS red
}

const TEXT_COLOR = new Color("#8e8e93")

// Progress bar
const width = 125
const h = 6

//=============================//

async function fetchTodaysFeedings() {
  try {
    // Get current date in correct format (YYYY-MM-DD)
    let now = new Date()
    const offset = now.getTimezoneOffset()
    now = new Date(now.getTime() - offset * 60 * 1000)
    const dateString = now.toISOString().split("T")[0]

    // Build API URL manually
    const url = `${BABY_BUDDY_SERVER}/api/feedings/?child=${CHILD_ID}&start_max=${dateString}T23:59:59-03:00&end_min=${dateString}T00:00:00-03:00`

    console.log(url)

    const request = new Request(url)
    request.headers = {
      Authorization: `Token ${API_TOKEN}`,
      Accept: "application/json",
    }

    const response = await request.loadJSON()

    console.log(response)
    let total = 0

    total += response.results.reduce(
      (sum, feeding) => sum + (feeding.amount || 0),
      0
    )

    return {
      total: total,
      percentage: Math.min((total / DAILY_GOAL_ML) * 100, 100),
      goal: DAILY_GOAL_ML,
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return null
  }
}

function createProgress(total, havegone) {
  const percentage = (havegone / total) * 100
  console.log(percentage)

  // Progress bar color
  const progressColor =
    percentage >= 100
      ? PROGRESS_COLORS.progress
      : percentage >= 50
      ? PROGRESS_COLORS.warning
      : PROGRESS_COLORS.danger

  const context = new DrawContext()
  context.size = new Size(width, h)
  context.opaque = false
  context.respectScreenScale = true
  context.setFillColor(PROGRESS_COLORS.background)

  // background
  const path = new Path()
  path.addRoundedRect(new Rect(0, 0, width, h), 3, 2)
  context.addPath(path)
  context.fillPath()
  context.setFillColor(progressColor)

  // progress
  const path1 = new Path()
  path1.addRoundedRect(new Rect(0, 0, (width * havegone) / total, h), 3, 2)
  context.addPath(path1)
  context.fillPath()

  return context.getImage()
}

async function createWidget() {
  // Fetch data
  const feedingData = await fetchTodaysFeedings()

  const widget = new ListWidget()

  widget.backgroundColor = new Color("#ffffff") // White background
  //   widget.setPadding(12,12,12,12);

  // Main stack
  const mainStack = widget.addStack()
  mainStack.layoutVertically()
  //   mainStack.borderColor = Color.red()
  //   mainStack.borderWidth = 2
  //   mainStack.spacing = 8;

  // Header
  const headerStack = mainStack.addStack()
  headerStack.topAlignContent()
  //   headerStack.borderColor = Color.red()
  //   headerStack.borderWidth = 2

  const title = headerStack.addText("🍼 Goal")
  title.font = Font.mediumSystemFont(12)
  title.textColor = TEXT_COLOR

  // The trick to align the second stack to the right is to add a spacer
  headerStack.addSpacer()

  const dateText = headerStack.addText(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  )
  dateText.font = Font.mediumSystemFont(12)
  dateText.textColor = TEXT_COLOR
  mainStack.addSpacer(12)

  if (feedingData) {
    const percentText = mainStack.addText(
      `${Math.round(feedingData.percentage)}%`
    )
    percentText.font = Font.lightSystemFont(40)
    percentText.textColor = TEXT_COLOR
    // Progress bar
    mainStack.addSpacer(6)
    const imgw = mainStack.addImage(
      createProgress(DAILY_GOAL_ML, feedingData.total)
    )

    mainStack.addSpacer(12)

    const goal = mainStack.addText(`${feedingData.total} / ${DAILY_GOAL_ML}ml`)
    goal.font = Font.mediumSystemFont(12)
    goal.textColor = TEXT_COLOR
  } else {
    const errorText = mainStack.addText("No data available")
    errorText.font = Font.mediumSystemFont(14)
    errorText.textColor = PROGRESS_COLORS.danger
  }

  return widget
}

// Run the script
if (config.runsInWidget) {
  Script.setWidget(await createWidget())
} else {
  await createWidget()
}
