// For testing purposes, we'll use a placeholder base64 image
// In a real implementation, you would fetch the image from the URL and convert it
// The URL provided is: https://commons.wikimedia.org/wiki/Main_Page#/media/File:20200529_Widok_ze_Ska%C5%82y_Okr%C4%85%C5%BCek_na_Opactwo_w_Ty%C5%84cu_1735_2128.jpg

// A more visible test image (200x100 gradient rectangle) in base64 format for testing
// In production, you would implement proper image fetching and conversion
export const DEFAULT_TEST_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzMzNzNkYztzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDA5NjFiO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjZ3JhZGllbnQpIiAvPgogIDx0ZXh0IHg9IjEwMCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlRlc3QgSW1hZ2U8L3RleHQ+Cjwvc3ZnPg=='

// Function to fetch and convert image to base64 (placeholder implementation)
export async function fetchImageAsBase64(url: string): Promise<string> {
	try {
		// For now, return the test image
		// In production, implement actual fetching:
		// const response = await fetch(url)
		// const blob = await response.blob()
		// return new Promise((resolve) => {
		//   const reader = new FileReader()
		//   reader.onloadend = () => resolve(reader.result as string)
		//   reader.readAsDataURL(blob)
		// })
		return DEFAULT_TEST_IMAGE
	} catch (error) {
		console.error('Failed to fetch image:', error)
		return DEFAULT_TEST_IMAGE
	}
}