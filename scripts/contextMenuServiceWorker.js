// Function to get + decode API key
const getKey = () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['openai-key'], (result) => {
        if (result['openai-key']) {
          const decodedKey = atob(result['openai-key']);
          resolve(decodedKey);
        }
      });
    });
  };

  const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;
  
      chrome.tabs.sendMessage(
        activeTab,
        { message: 'inject', content },
        (response) => {
          if (response.status === 'failed') {
            console.log('injection failed.');
          }
        }
      );
    });
  };

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = 'https://api.openai.com/v1/completions';
	
  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 1500,
      temperature: 0.9,
    }),
  });
	
  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
    try {
        // Send message with generating text (this will be like a loading indicator)
        sendMessage('generating...');
        const { selectionText } = info;
        const basePromptPrefix = `
        Write a summary of the MESSAGE written below in a Pirate's accent.

        MESSAGE: 
        `;

        const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);
        console.log(baseCompletion.text);
        
        const secondPrompt = `
      Take the SUMMARY and MESSAGE below to create a Pirate-accent themed HEADING.
      
      MESSAGE: ${selectionText}
      
      SUMMARY: ${baseCompletion.text}
      
      HEADING:
      `;
         // Call your second prompt
    const secondPromptCompletion = await generate(secondPrompt);
    console.log(secondPromptCompletion.text);
    const finalPromptCompletion = 
    `
    ${secondPromptCompletion.text}

    ${baseCompletion.text}
    `
    console.log(finalPromptCompletion);
    sendMessage(finalPromptCompletion);

      } catch (error) {
        console.log(error);
        // Add this here as well to see if we run into any errors!
    sendMessage(error.toString());
      }
};

// listening for when the extension is installed. When that happens, we create a new option in our menu that will read “Generate blog post”.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'context-run',
      title: 'Summarize Text with Pirate-fy',
      contexts: ['selection'],
    });
  });
  
  // we setup a listener for whenever that is clicked to call the generateCompletionAction function.
  chrome.contextMenus.onClicked.addListener(generateCompletionAction);