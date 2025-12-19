import React from 'react'
import { MoonLoader } from 'react-spinners'

export default function Loader() {
  return (
    <div className='big_loader'><MoonLoader size={80} color='#4FD1C5'/></div>
  )
}
