//======= CONFIGURATION =======//
const BABY_BUDDY_SERVER = ""
const API_TOKEN = ""

// Generic function to fetch last activity
async function fetchLastActivity(endpoint) {
  const url = `${BABY_BUDDY_SERVER}/api/${endpoint}/?ordering=-started_at&limit=1`
  const headers = {
    Authorization: `Token ${API_TOKEN}`,
    Accept: "application/json",
  }

  const request = new Request(url)
  request.headers = headers

  try {
    const response = await request.loadJSON()

    console.log(endpoint)
    console.log(response)
    return response.results?.[0] || null
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error)
    return null
  }
}

function timeSince(dateString) {
  const now = new Date()
  const then = new Date(dateString)
  const diff = now - then

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`
  } else {
    return minutes === 0 ? "Just now" : `${minutes}m ago`
  }
}

async function createWidget() {
  const widget = new ListWidget()
  widget.backgroundColor = new Color("#1a1a1a")

  // Fetch both data points in parallel
  const [lastFeed, lastChange] = await Promise.all([
    fetchLastActivity("feedings"),
    fetchLastActivity("changes"),
  ])

  // Create main stack
  const mainStack = widget.addStack()
  mainStack.topAlignContent()
  mainStack.layoutVertically()
  mainStack.spacing = 18

  // Add feeding info
  const feedStack = mainStack.addStack()
  feedStack.layoutVertically()

  const feedLabel = feedStack.addText("🍼 Last Feeding")
  feedLabel.font = Font.mediumSystemFont(12)
  feedLabel.textColor = Color.gray()

  const feedTime = feedStack.addText(
    lastFeed ? timeSince(lastFeed.start) : "--"
  )
  feedTime.font = Font.semiboldSystemFont(20)
  feedTime.textColor = Color.green()

  // Add diaper info
  const diaperStack = mainStack.addStack()
  diaperStack.layoutVertically()

  const diaperLabel = diaperStack.addText("🩲 Last Diaper")
  diaperLabel.font = Font.mediumSystemFont(12)
  diaperLabel.textColor = Color.gray()

  const diaperTime = diaperStack.addText(
    lastChange ? timeSince(lastChange.time) : "--"
  )
  diaperTime.font = Font.semiboldSystemFont(20)
  diaperTime.textColor = Color.orange()

  return widget
}

// Run the script
if (config.runsInWidget) {
  Script.setWidget(await createWidget())
} else {
  await createWidget()
}
