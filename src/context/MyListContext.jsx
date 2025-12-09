// src/context/MyListContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const MyListContext = createContext();

export const MyListProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [myList, setMyList] = useState([]);

  useEffect(() => {
    if (user) {
      const storedList = localStorage.getItem(`myList_${user.id}`);
      if (storedList) {
        setMyList(JSON.parse(storedList));
      }
    } else {
      setMyList([]);
    }
  }, [user]);

  const addToMyList = (item) => {
    const updatedList = [...myList, item];
    setMyList(updatedList);
    if (user) {
      localStorage.setItem(`myList_${user.id}`, JSON.stringify(updatedList));
    }
  };

  const removeFromMyList = (itemId) => {
    const updatedList = myList.filter((item) => item.id !== itemId);
    setMyList(updatedList);
    if (user) {
      localStorage.setItem(`myList_${user.id}`, JSON.stringify(updatedList));
    }
  };

  const isInMyList = (itemId) => {
    return myList.some((item) => item.id === itemId);
  };

  return (
    <MyListContext.Provider value={{ myList, addToMyList, removeFromMyList, isInMyList }}>
      {children}
    </MyListContext.Provider>
  );
};
