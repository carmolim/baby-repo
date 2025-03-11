//======= CONFIGURATION =======//

const BABY_BUDDY_SERVER = ""
const API_TOKEN = ""
const CHILD_ID = 1
const DAYS_TO_SHOW = 9

// Colors and styling
const WIDGET_BG_COLOR = new Color("#FFFFFF")
const BREAST_MILK_COLOR = new Color("#34c759")
const FORMULA_COLOR = new Color("#ff9500")
const EMPTY_DAY_COLOR = new Color("#8e8e93")
const TEXT_COLOR = EMPTY_DAY_COLOR

// Chart dimensions
const CHART_HEIGHT = 160
const HORIZONTAL_PADDING = 12

//=============================//

// Fetch feedings history from server
async function fetchFeedingsHistory() {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - DAYS_TO_SHOW + 1)
    const formatDate = (date) => date.toISOString().split("T")[0]
    const url = `${BABY_BUDDY_SERVER}/api/feedings/?child=${CHILD_ID}&start_max=${formatDate(
      endDate
    )}T23:59:59-03:00&end_min=${formatDate(startDate)}T00:00:00-03:00`

    const request = new Request(url)
    request.headers = {
      Authorization: `Token ${API_TOKEN}`,
      Accept: "application/json",
    }
    const response = await request.loadJSON()
    return response.results
  } catch (error) {
    console.error("Fetch error:", error)
    return []
  }
}

// Process the raw feedings into a array (by date)
function processFeedingsData(feedings) {
  const dateMap = new Map()
  const now = new Date()

  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    dateMap.set(date.toISOString().split("T")[0], {
      date: new Date(date),
      breast: 0,
      formula: 0,
    })
  }

  feedings.forEach((feeding) => {
    const feedingDate = new Date(feeding.start)
    feedingDate.setHours(0, 0, 0, 0)
    const key = feedingDate.toISOString().split("T")[0]
    if (dateMap.has(key)) {
      const entry = dateMap.get(key)
      if (feeding.type === "breast milk") {
        entry.breast += feeding.amount || 0
      } else if (feeding.type === "formula") {
        entry.formula += feeding.amount || 0
      }
    }
  })

  return Array.from(dateMap.values()).sort((a, b) => a.date - b.date)
}

// Create a stacked bar chart image using perfect rounded rects
function createStackedBarChart(data) {
  const maxAmount = Math.max(...data.map((d) => d.breast + d.formula)) || 1
  const ctx = new DrawContext()
  ctx.size = new Size(300, CHART_HEIGHT)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const barWidth =
    (300 - (DAYS_TO_SHOW - 1) * HORIZONTAL_PADDING) / DAYS_TO_SHOW
  const pillRadius = barWidth / 2

  data.forEach((day, index) => {
    const x = (barWidth + HORIZONTAL_PADDING) * index
    const totalHeight = ((day.breast + day.formula) / maxAmount) * CHART_HEIGHT
    let formulaHeight = (day.formula / maxAmount) * CHART_HEIGHT
    const breastHeight = totalHeight - formulaHeight
    const hasData = day.breast + day.formula > 0

    if (!hasData) {
      // No data: draw a gray dot in the bar's area.
      ctx.setFillColor(EMPTY_DAY_COLOR)
      const dotSize = pillRadius * 2
      const dotX = x + (barWidth - dotSize) / 2
      const dotY = CHART_HEIGHT - dotSize - 2
      ctx.fillEllipse(new Rect(dotX, dotY, dotSize, dotSize))
    } else {
      if (day.breast > 0 && day.formula > 0) {
        // Mixed case: stacked bar.
        // Option A: Force formula segment height to be at least barWidth (for a perfect semicircle)
        if (formulaHeight < barWidth) {
          formulaHeight = barWidth
        }

        // Draw the breast segment (top) with rounded top corners.
        ctx.setFillColor(BREAST_MILK_COLOR)
        let breastRect = new Rect(
          x,
          CHART_HEIGHT - totalHeight,
          barWidth,
          breastHeight
        )
        let breastPath = new Path()
        addPerfectRoundedRect(breastPath, breastRect, {
          topLeft: pillRadius,
          topRight: pillRadius,
          bottomRight: 0,
          bottomLeft: 0,
        })
        ctx.addPath(breastPath)
        ctx.fillPath()

        // Draw the formula segment (bottom) with rounded bottom corners.
        ctx.setFillColor(FORMULA_COLOR)

        // We want the bottom part's rectangle to be tall enough to show the full pillRadius.
        let formulaRect = new Rect(
          x,
          CHART_HEIGHT - formulaHeight,
          barWidth,
          formulaHeight
        )
        let formulaPath = new Path()
        addPerfectRoundedRect(formulaPath, formulaRect, {
          topLeft: 0,
          topRight: 0,
          bottomRight: pillRadius,
          bottomLeft: pillRadius,
        })
        ctx.addPath(formulaPath)
        ctx.fillPath()
      } else if (day.breast > 0) {
        // Only breast: full pill shape.
        ctx.setFillColor(BREAST_MILK_COLOR)
        let rect = new Rect(
          x,
          CHART_HEIGHT - totalHeight,
          barWidth,
          totalHeight
        )
        let path = new Path()
        addPerfectRoundedRect(path, rect, {
          topLeft: pillRadius,
          topRight: pillRadius,
          bottomRight: pillRadius,
          bottomLeft: pillRadius,
        })
        ctx.addPath(path)
        ctx.fillPath()
      } else if (day.formula > 0) {
        // Only formula: full pill shape.
        ctx.setFillColor(FORMULA_COLOR)
        let rect = new Rect(
          x,
          CHART_HEIGHT - totalHeight,
          barWidth,
          totalHeight
        )
        let path = new Path()
        addPerfectRoundedRect(path, rect, {
          topLeft: pillRadius,
          topRight: pillRadius,
          bottomRight: pillRadius,
          bottomLeft: pillRadius,
        })
        ctx.addPath(path)
        ctx.fillPath()
      }
    }
  })

  return ctx.getImage()
}
/*
  The addPerfectRoundedRect function draws a rectangle with perfectly circular
  (pill‐shaped) rounded corners using cubic Bézier curves. Each corner uses the same
  constant (pillRadius) when rounded.
*/
function addPerfectRoundedRect(path, rect, radii) {
  let { topLeft, topRight, bottomRight, bottomLeft } = radii
  // Clamp radii so they never exceed half the rect's dimensions.
  const maxRadius = Math.min(rect.width / 2, rect.height / 2)
  topLeft = Math.min(topLeft, maxRadius)
  topRight = Math.min(topRight, maxRadius)
  bottomRight = Math.min(bottomRight, maxRadius)
  bottomLeft = Math.min(bottomLeft, maxRadius)

  const k = 0.5522847498 // Control point constant for approximating a circular arc
  const x = rect.x
  const y = rect.y
  const w = rect.width
  const h = rect.height

  // Start at top-left (offset right by topLeft radius)
  path.move(new Point(x + topLeft, y))

  // Top edge: to just before top-right arc
  path.addLine(new Point(x + w - topRight, y))

  // Top-right corner
  if (topRight > 0) {
    let cp1 = new Point(x + w - topRight + k * topRight, y)
    let cp2 = new Point(x + w, y + topRight - k * topRight)
    let endPt = new Point(x + w, y + topRight)
    path.addCurve(endPt, cp1, cp2)
  } else {
    path.addLine(new Point(x + w, y))
  }

  // Right edge: to just before bottom-right arc
  path.addLine(new Point(x + w, y + h - bottomRight))

  // Bottom-right corner
  if (bottomRight > 0) {
    let cp1 = new Point(x + w, y + h - bottomRight + k * bottomRight)
    let cp2 = new Point(x + w - bottomRight + k * bottomRight, y + h)
    let endPt = new Point(x + w - bottomRight, y + h)
    path.addCurve(endPt, cp1, cp2)
  } else {
    path.addLine(new Point(x + w, y + h))
  }

  // Bottom edge: to just before bottom-left arc
  path.addLine(new Point(x + bottomLeft, y + h))

  // Bottom-left corner
  if (bottomLeft > 0) {
    let cp1 = new Point(x + bottomLeft - k * bottomLeft, y + h)
    let cp2 = new Point(x, y + h - bottomLeft + k * bottomLeft)
    let endPt = new Point(x, y + h - bottomLeft)
    path.addCurve(endPt, cp1, cp2)
  } else {
    path.addLine(new Point(x, y + h))
  }

  // Left edge: to just before top-left arc
  path.addLine(new Point(x, y + topLeft))

  // Top-left corner
  if (topLeft > 0) {
    let cp1 = new Point(x, y + topLeft - k * topLeft)
    let cp2 = new Point(x + topLeft - k * topLeft, y)
    let endPt = new Point(x + topLeft, y)
    path.addCurve(endPt, cp1, cp2)
  } else {
    path.addLine(new Point(x, y))
  }

  path.closeSubpath()
}

// Build the widget with header, chart, and legend
async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = WIDGET_BG_COLOR
  widget.setPadding(HORIZONTAL_PADDING, 12, HORIZONTAL_PADDING, 12)

  const rawFeedings = await fetchFeedingsHistory()
  const chartData = processFeedingsData(rawFeedings)

  const header = widget.addText("🍼 Feeding History")
  header.font = Font.mediumSystemFont(12)
  header.textColor = TEXT_COLOR
  widget.addSpacer(8)

  const chartStack = widget.addStack()
  chartStack.addImage(createStackedBarChart(chartData))
  chartStack.centerAlignContent()

  widget.addSpacer(12)

  // Simple legend
  const legendStack = widget.addStack()
  legendStack.topAlignContent()

  const breastStack = legendStack.addStack()
  breastStack.centerAlignContent()
  breastStack.spacing = 4
  const bullet1 = breastStack.addText("●")
  bullet1.font = Font.mediumSystemFont(10)
  bullet1.textColor = BREAST_MILK_COLOR
  const breastText = breastStack.addText("Breast")
  breastText.font = Font.mediumSystemFont(12)
  breastText.textColor = TEXT_COLOR

  legendStack.addSpacer()

  const formulaStack = legendStack.addStack()
  formulaStack.centerAlignContent()
  formulaStack.spacing = 4
  const bullet2 = formulaStack.addText("●")
  bullet2.font = Font.mediumSystemFont(10)
  bullet2.textColor = FORMULA_COLOR
  const formulaText = formulaStack.addText("Formula")
  formulaText.font = Font.mediumSystemFont(12)
  formulaText.textColor = TEXT_COLOR

  return widget
}

if (config.runsInWidget) {
  Script.setWidget(await createWidget())
} else {
  await createWidget()
}
