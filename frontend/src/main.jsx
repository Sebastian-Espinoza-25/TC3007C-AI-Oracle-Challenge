import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

// LAYOUTS
import DefaultLayout from './layouts/DefaultLayout'

// PAGES
import Home from './pages/Home'
import Login from './pages/Login'

const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultLayout/>,
    children: [
      {index: true, element: <Home/>},
      {path: "/login", element: <Login/>}
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>,
)
