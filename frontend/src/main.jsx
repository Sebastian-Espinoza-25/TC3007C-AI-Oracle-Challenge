import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

// LAYOUTS
import DefaultLayout from './layouts/DefaultLayout'
import SimpleLayout from './layouts/SimpleLayout'

// PAGES
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

const router = createBrowserRouter([
  {
    path: "/", // Here we define default route
    element: <DefaultLayout/>, // Here we render Default Layout with the navbar and sidebar repeated in each children page
    children: [
      {index: true, element: <Home/>},
      
    ]
  },
  {
    path: "/auth",
    element: <SimpleLayout/>,
    children: [
      { path: "login", element: <Login/> }, // If you want add a new route with this Layout only need to generate another children with a path and element
      { path: "signup", element: <Register/> }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>,
)
