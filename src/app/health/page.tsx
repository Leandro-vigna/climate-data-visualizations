export default function HealthPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">✅ Server Health Check</h1>
      <p>If you can see this page, the server is working correctly.</p>
      <div className="mt-4 space-y-2">
        <p><strong>Time:</strong> {new Date().toISOString()}</p>
        <p><strong>Status:</strong> OK</p>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Next Steps:</h2>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><a href="/" className="text-blue-600 hover:underline">Go to Home Page</a></li>
          <li><a href="/setup-scl" className="text-blue-600 hover:underline">Setup SCL Configuration</a></li>
          <li><a href="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</a> (requires login)</li>
        </ul>
      </div>
    </div>
  );
}
