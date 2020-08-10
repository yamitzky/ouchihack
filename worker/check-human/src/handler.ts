import axios from 'axios'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import { AttributeValue } from 'aws-sdk/clients/dynamodbstreams'

const dynamodb = new DynamoDB()

type Event = {
  val: number
  created_at: string
}

type Device = {
  id: string
  name: string
  temperature_offset: number
  humidity_offset: number
  created_at: string
  updated_at: string
  firmware_version: string
  mac_address: string
  serial_number: string
  newest_events: {
    te: Event
    hu: Event
    il: Event
    mo: Event
  }
}

const { NATURE_REMO_TOKEN, TABLE_NAME, WEBHOOK_URL } = process.env as Record<
  string,
  string
>
if (!NATURE_REMO_TOKEN) {
  throw new Error(
    'No NATURE_REMO_TOKEN specified! You can grab token https://home.nature.global/'
  )
}
if (!TABLE_NAME) {
  throw new Error(
    'No TABLE_NAME specified! You must specify DynamoDB table name!'
  )
}

async function getPrevValue(
  id: string
): Promise<Record<keyof Event | 'id', AttributeValue> | undefined> {
  const result = await dynamodb
    .getItem({
      TableName: TABLE_NAME,
      Key: { id: { S: `remo-mo-${id}` } },
    })
    .promise()
  return result.Item as any
}

async function setValue(id: string, event: Event): Promise<void> {
  await dynamodb
    .putItem({
      TableName: TABLE_NAME,
      Item: {
        id: { S: `remo-mo-${id}` },
        val: { N: event.val.toFixed() },
        created_at: { S: event.created_at },
      },
    })
    .promise()
}

export const handler = async () => {
  const { data: devices } = await axios.get<Device[]>(
    'https://api.nature.global/1/devices',
    {
      headers: {
        Authorization: `Bearer ${NATURE_REMO_TOKEN}`,
      },
    }
  )
  for (const device of devices) {
    const event = device.newest_events.mo
    if (event) {
      const prev = await getPrevValue(device.id)
      if (event.created_at !== prev?.created_at.S) {
        await setValue(device.id, event)
        const hour = new Date(event.created_at).getUTCHours()
        if (WEBHOOK_URL && !(16 <= hour && hour < 24)) {
          await axios.post(WEBHOOK_URL, { id: device.id, ...event })
        }
      }
    }
  }
}
