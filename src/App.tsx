import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import './App.css'

function App() {
  return (
    <div className="w-80 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Redact Paste</CardTitle>
          <CardDescription>Sensitive data redactor</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This extension automatically redacts sensitive information when you paste text into a web page.</p>
          <p className="text-xs text-muted-foreground mt-4">
            Currently redacting emails and named entities.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
