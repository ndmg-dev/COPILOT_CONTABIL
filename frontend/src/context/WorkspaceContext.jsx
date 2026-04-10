import React, { createContext, useContext, useState } from 'react';

const WorkspaceContext = createContext();

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }) => {
    const [documents, setDocuments] = useState([]);
    const [messages, setMessages] = useState([]);

    const clearWorkspaceSession = () => {
        setDocuments([]);
        setMessages([]);
    };

    return (
        <WorkspaceContext.Provider value={{
            documents, setDocuments,
            messages, setMessages,
            clearWorkspaceSession
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};
