/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import Editor from '@monaco-editor/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  ForwardedRef,
  SetStateAction,
  Dispatch,
} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import { AppConfig, ContentBasis, EducationalMaterialRequest } from '@/App';
import EmbedCodeModal from '@/components/EmbedCodeModal';
import DeployModal from '@/components/DeployModal'; 


import {parseHTML, parseJSON} from '@/lib/parse';
import {
  SPEC_ADDENDUM,
  SPEC_FROM_VIDEO_PROMPT,
  SPEC_FROM_TOPIC_PROMPT_TEMPLATE,
  REFINE_SPEC_PROMPT_TEMPLATE,
  LESSON_PLAN_PROMPT_TEMPLATE,
  HANDOUT_PROMPT_TEMPLATE,
  QUIZ_PROMPT_TEMPLATE,
} from '@/lib/prompts';
import {generateText, generateTextStream, TextGenerationInteraction} from '@/lib/textGeneration';
import { GroundingChunk, HarmCategory, HarmBlockThreshold, SafetySetting } from '@google/genai';

interface ContentContainerProps {
  contentBasisInput: ContentBasis;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onLlmInteraction: (interaction: TextGenerationInteraction) => void;
  requestedMaterials: EducationalMaterialRequest;
  isOutputExpanded: boolean;
  appConfig: AppConfig | null;
  userCredits: number;
  setUserCredits: Dispatch<SetStateAction<number>>;
  setShowPurchaseModal: Dispatch<SetStateAction<boolean>>;
}

export interface ContentContainerHandle {
  getSpec: () => string;
  getCode: () => string;
}

type LoadingState = 
  | 'idle'
  | 'loading-spec' 
  | 'loading-code' 
  | 'refining-spec'
  | 'loading-lesson-plan'
  | 'loading-handout'
  | 'loading-quiz'
  | 'ready' 
  | 'error';

const defaultSafetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const EDIT_SPEC_COST = 25; // Cost in credits to edit or refine the spec

export default forwardRef(function ContentContainer(
  {
    contentBasisInput,
    onLoadingStateChange,
    onLlmInteraction,
    requestedMaterials,
    isOutputExpanded,
    appConfig,
    userCredits,
    setUserCredits,
    setShowPurchaseModal,
  }: ContentContainerProps,
  ref: ForwardedRef<ContentContainerHandle>,
) {
  const [spec, setSpec] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [lessonPlan, setLessonPlan] = useState<string | null>(null);
  const [handout, setHandout] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any | null>(null); 

  const [iframeKey, setIframeKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>('Generating app spec & code...');
  const [error, setError] = useState<string | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[] | null>(null);
  
  const [refinementText, setRefinementText] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);


  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false); 


  useImperativeHandle(ref, () => ({
    getSpec: () => spec,
    getCode: () => code,
  }), [spec, code]);
  
  const getComplexityInstruction = (level: number): string => {
    const complexityMap: {[key: number]: string} = {
        1: 'The user has requested a SIMPLE app. Keep concepts basic and interactions straightforward. Focus on a single core idea.',
        2: 'The user has requested a STANDARD app with a good balance of detail and interactivity.',
        3: 'The user has requested a DETAILED and COMPREHENSIVE app. Include multiple features, in-depth explanations, and rich interactions.'
    };
    return complexityMap[level] || complexityMap[2]; // Default to standard
  };


  const generateEducationalMaterials = useCallback(async (currentSpec: string) => {
    if (requestedMaterials.lessonPlan) {
      setLoadingState('loading-lesson-plan');
      setLoadingMessage('Generating lesson plan...');
      try {
        const { text } = await generateText({
          modelName: 'gemini-2.5-flash',
          basePrompt: LESSON_PLAN_PROMPT_TEMPLATE.replace('[APP_SPECIFICATION_HERE]', currentSpec),
          safetySettings: defaultSafetySettings,
          onInteraction: onLlmInteraction,
        });
        setLessonPlan(text);
      } catch (err) {
        console.error('Error generating lesson plan:', err);
        setLessonPlan(`Error generating lesson plan: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    if (requestedMaterials.handout) {
      setLoadingState('loading-handout');
      setLoadingMessage('Generating student handout...');
      try {
        const { text } = await generateText({
          modelName: 'gemini-2.5-flash',
          basePrompt: HANDOUT_PROMPT_TEMPLATE.replace('[APP_SPECIFICATION_HERE]', currentSpec),
          safetySettings: defaultSafetySettings,
          onInteraction: onLlmInteraction,
        });
        setHandout(text);
      } catch (err) {
        console.error('Error generating handout:', err);
        setHandout(`Error generating handout: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    if (requestedMaterials.quiz) {
      setLoadingState('loading-quiz');
      setLoadingMessage('Generating review quiz...');
      try {
        const { text } = await generateText({
          modelName: 'gemini-2.5-flash',
          basePrompt: QUIZ_PROMPT_TEMPLATE.replace('[APP_SPECIFICATION_HERE]', currentSpec),
          safetySettings: defaultSafetySettings,
          responseMimeType: "application/json",
          onInteraction: onLlmInteraction,
        });
        const parsedQuiz = parseJSON(text);
        setQuiz(parsedQuiz.quiz || parsedQuiz); 
      } catch (err) {
        console.error('Error generating quiz:', err);
        setQuiz({ error: `Error generating quiz: ${err instanceof Error ? err.message : 'Unknown error'}` });
      }
    }
  }, [requestedMaterials, onLlmInteraction]);

  const regenerateCodeFromSpec = useCallback(async (currentSpec: string): Promise<string> => {
    const { text: codeResponseText } = await generateText({
      modelName: 'gemini-2.5-flash',
      basePrompt: currentSpec,
      safetySettings: defaultSafetySettings,
      onInteraction: onLlmInteraction,
    });
    return parseHTML(codeResponseText);
  }, [onLlmInteraction]);


  useEffect(() => {
    if (onLoadingStateChange) {
      const isLoading = !['ready', 'error', 'idle'].includes(loadingState);
      onLoadingStateChange(isLoading);
    }
  }, [loadingState, onLoadingStateChange]);

  useEffect(() => {
    const generateContentFlow = async () => {
      const { videoUrl, topicOrDetails, complexity } = contentBasisInput;
      if (!videoUrl && !topicOrDetails) {
         setError("No video URL or topic provided.");
         setLoadingState('error');
         setActiveTabIndex(0);
         return;
      }

      try {
        // 1. Initial State Setup
        setLoadingState('loading-spec');
        setLoadingMessage('Generating app specification...');
        setActiveTabIndex(0); // Start on Spec tab
        setError(null);
        setSpec(''); setCode(''); setGroundingChunks(null);
        setLessonPlan(null); setHandout(null); setQuiz(null); 
        
        // 2. Prepare Spec Generation Request
        const complexityInstruction = getComplexityInstruction(complexity || 2);
        const userDetails = [
            topicOrDetails ? `User-provided details: ${topicOrDetails}` : '',
            `Complexity instruction: ${complexityInstruction}`
        ].filter(Boolean).join('\n');
        
        const requestOptions = videoUrl
          ? {
              modelName: 'gemini-2.5-flash',
              basePrompt: SPEC_FROM_VIDEO_PROMPT,
              additionalUserText: userDetails,
              videoUrl: videoUrl,
              safetySettings: defaultSafetySettings,
              onInteraction: onLlmInteraction,
            }
          : {
              modelName: 'gemini-2.5-flash',
              basePrompt: SPEC_FROM_TOPIC_PROMPT_TEMPLATE.replace('[USER_TOPIC_HERE]', topicOrDetails!),
              additionalUserText: `Complexity instruction: ${complexityInstruction}`,
              safetySettings: defaultSafetySettings,
              useGoogleSearch: true,
              onInteraction: onLlmInteraction,
            };

        // 3. Stream Spec
        const streamResult = await generateTextStream(requestOptions);
        let currentSpec = '';
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text;
          currentSpec += chunkText;
          setSpec(currentSpec);
        }

        const aggregatedResponse = await streamResult.response;
        const finalSpecText = aggregatedResponse.text;
        const finalSpecWithAddendum = finalSpecText + SPEC_ADDENDUM;

        setSpec(finalSpecWithAddendum);
        setGroundingChunks(aggregatedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? null);

        // 4. Generate Code
        setLoadingState('loading-code');
        setLoadingMessage('Generating app code from spec...');
        setActiveTabIndex(1); // Switch to Code tab

        const generatedCode = await regenerateCodeFromSpec(finalSpecWithAddendum);
        setCode(generatedCode);
        
        // 5. Generate Educational Materials
        await generateEducationalMaterials(finalSpecWithAddendum);

        // 6. Finish
        setLoadingState('ready');
        setLoadingMessage('App ready!');
        setActiveTabIndex(2); // Switch to Render tab

      } catch (err) {
        console.error('An error occurred while attempting to generate content:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoadingState('error');
        // Stay on the tab where the error most likely occurred
        if (!spec) setActiveTabIndex(0);
        else if (spec && !code) setActiveTabIndex(1);
      }
    };

    if (contentBasisInput) {
        generateContentFlow();
    } else {
        setLoadingState('idle');
        setActiveTabIndex(0);
        setError(null);
        setSpec(''); setCode(''); setGroundingChunks(null);
        setLessonPlan(null); setHandout(null); setQuiz(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBasisInput]);

  useEffect(() => {
    if (code) setIframeKey((prev) => prev + 1);
  }, [code]);

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);
  
  const handleSpecCancel = useCallback(() => {
    setIsEditingSpec(false);
    setEditedSpec('');
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (isEditingSpec && countdown !== null) {
      if (countdown === 0) {
        handleSpecCancel();
        return;
      }
      const timerId = setInterval(() => {
        setCountdown(c => (c ? c - 1 : 0));
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [isEditingSpec, countdown, handleSpecCancel]);


  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
    setSaveMessage('HTML updated. Changes will appear in the Render tab.');
  };

  const handleSpecEdit = () => {
    if (appConfig?.revenueCat?.enabled && userCredits < EDIT_SPEC_COST) {
      alert(`You need ${EDIT_SPEC_COST} credits to edit the spec, but you only have ${userCredits}.`);
      setShowPurchaseModal(true);
      return;
    }
    setEditedSpec(spec);
    setIsEditingSpec(true);
    setCountdown(20);
  };

  const handleSpecSave = async () => {
    setCountdown(null); // Stop countdown immediately
    const trimmedEditedSpec = editedSpec.trim();
    if (trimmedEditedSpec === spec) {
      setIsEditingSpec(false);
      setEditedSpec('');
      return;
    }

    try {
      // Deduct credits before starting regeneration
      if (appConfig?.revenueCat?.enabled) {
          setUserCredits(prev => prev - EDIT_SPEC_COST);
      }

      setLoadingState('loading-code');
      setLoadingMessage('Regenerating code from spec...');
      setError(null);
      setSpec(trimmedEditedSpec);
      setIsEditingSpec(false);
      setActiveTabIndex(1); // Switch to code tab

      const generatedCode = await regenerateCodeFromSpec(trimmedEditedSpec);
      setCode(generatedCode);
      
      setLessonPlan(null); setHandout(null); setQuiz(null); 
      await generateEducationalMaterials(trimmedEditedSpec);

      setLoadingState('ready');
      setActiveTabIndex(2); // Switch to render when done
    } catch (err) {
      console.error('Error generating code from edited spec:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoadingState('error');
      setActiveTabIndex(1);
    }
  };


  const handleRefineSubmit = async (refinementInstructions: string) => {
    if (!spec) {
      alert("Cannot refine: No current specification available.");
      return;
    }
    if (appConfig?.revenueCat?.enabled && userCredits < EDIT_SPEC_COST) {
      alert(`You need ${EDIT_SPEC_COST} credits to refine the spec, but you only have ${userCredits}.`);
      setShowPurchaseModal(true);
      return;
    }

    try {
      if (appConfig?.revenueCat?.enabled) {
        setUserCredits(prev => prev - EDIT_SPEC_COST);
      }
      setLoadingState('refining-spec');
      setLoadingMessage('Refining app specification...');
      setError(null);
      setActiveTabIndex(0); 
      setRefinementText(''); // Clear input after submission
      
      const complexityInstruction = getComplexityInstruction(contentBasisInput.complexity || 2);
      const instructionsWithComplexity = `${refinementInstructions}\n\nMaintain the overall complexity level of the app, which is set to: ${complexityInstruction}`;

      const { text: refinedSpecJson } = await generateText({
        modelName: 'gemini-2.5-flash',
        basePrompt: REFINE_SPEC_PROMPT_TEMPLATE.replace('[EXISTING_SPEC_HERE]', spec).replace('[USER_REFINEMENT_INSTRUCTIONS_HERE]', instructionsWithComplexity),
        safetySettings: defaultSafetySettings,
        responseMimeType: "application/json",
        onInteraction: onLlmInteraction,
      });

      const parsedRefinedData = parseJSON(refinedSpecJson);
      let refinedSpecText = parsedRefinedData.spec;
      if (typeof refinedSpecText !== 'string') {
        throw new Error("The 'spec' field in the refined JSON response was not a string.");
      }
      refinedSpecText += SPEC_ADDENDUM;
      setSpec(refinedSpecText);

      setLoadingState('loading-code');
      setLoadingMessage('Generating code from refined spec...');
      setActiveTabIndex(1); // Switch to code tab
      const newCode = await regenerateCodeFromSpec(refinedSpecText);
      setCode(newCode);

      setLessonPlan(null); setHandout(null); setQuiz(null); 
      await generateEducationalMaterials(refinedSpecText);
      
      setLoadingState('ready');
      setActiveTabIndex(2); // Switch to render when done
    } catch (err) {
      console.error('Error refining spec:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoadingState('error');
      setActiveTabIndex(0);
    }
  };

  const handleRefinementTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRefinementText(e.target.value);
  };

  const handleRefinementKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRefineSubmit(refinementText);
    }
  };
  
  const handlePrint = (content: string | object, title: string) => {
    const printableWindow = window.open('', '_blank');
    if (printableWindow) {
      printableWindow.document.write(`<html><head><title>${title}</title>
      <style>
        body { font-family: sans-serif; line-height: 1.5; padding: 1em; } 
        pre { white-space: pre-wrap; word-wrap: break-word; background: #f4f4f4; padding: 1em; border-radius: 5px; }
        .quiz-container { margin-bottom: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 1em; } .question { font-weight: bold; } .options { list-style-type: lower-alpha; padding-left: 20px; } .explanation { font-style: italic; color: #555; margin-top: 0.5em;}
        h1, h2, h3 { color: #333; }
        ul { padding-left: 20px; }
      </style>
      </head><body>`);
      
      let htmlContent = '';

      if (typeof content === 'string') {
        // Basic markdown to HTML for printing
        htmlContent = content
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gim, '<li>$1</li>');
        htmlContent = htmlContent.replace(/<\/li>\n<li>/g, '</li><li>');
        if (htmlContent.includes('<li>')) {
            htmlContent = `<ul>${htmlContent}</ul>`;
        }
        htmlContent = htmlContent.replace(/\n/g, '<br />');
      } else if (quiz && !quiz.error && typeof content === 'object') {
        const quizArray = content as any[];
        htmlContent = '<h1>Review Quiz</h1>' + quizArray.map((q: any, i: number) => `
          <div class="quiz-container">
            <p class="question">${i + 1}. ${q.question}</p>
            <ul class="options">
              ${q.options.map((o: string) => `<li>${o}${o === q.correctAnswer ? ' <strong>(Correct)</strong>' : ''}</li>`).join('')}
            </ul>
            ${q.explanation ? `<p class="explanation"><strong>Explanation:</strong> ${q.explanation}</p>` : ''}
          </div>
        `).join('');
      } else if (quiz && quiz.error) {
         htmlContent = `<p>${quiz.error}</p>`;
      }
      
      printableWindow.document.write(htmlContent);
      printableWindow.document.write('</body></html>');
      printableWindow.document.close();
      printableWindow.print();
    }
  };

  const isLoading = !['ready', 'error', 'idle'].includes(loadingState);

  const renderQuiz = (quizData: any) => {
    if (!quizData) return <div className="material-placeholder">Generating quiz...</div>;
    if (quizData.error) {
      return <div className="error-display quiz-error">{quizData.error}</div>;
    }
    if (!Array.isArray(quizData)) {
      return <pre>{JSON.stringify(quizData, null, 2)}</pre>;
    }
    return (
      <div className="quiz-render-container">
        {quizData.map((item, index) => (
          <div key={index} className="quiz-item">
            <h4>{index + 1}. {item.question}</h4>
            <ul className="quiz-options">
              {item.options.map((option: string, i: number) => (
                <li key={i} className={option === item.correctAnswer ? 'correct' : ''}>
                  {option}
                  {option === item.correctAnswer && <span className="correct-indicator"> (Correct)</span>}
                </li>
              ))}
            </ul>
            {item.explanation && <p className="quiz-explanation"><strong>Explanation:</strong> {item.explanation}</p>}
          </div>
        ))}
      </div>
    );
  };
  
  const showRefineBar = (loadingState === 'ready' || loadingState === 'error') && (spec !== '');

  return (
    <>
      <div className="content-container-inner">
        <div className="content-actions">
           {code && (
            <div className="main-actions">
              <button onClick={() => setShowEmbedModal(true)} className="button-secondary">
                <span className="material-symbols-outlined">integration_instructions</span>
                <span>Get Embed Code</span>
              </button>
              <button onClick={() => setShowDeployModal(true)} className="button-secondary">
                 <span className="material-symbols-outlined">publish</span>
                 <span>Deploy / Share</span>
              </button>
            </div>
           )}
        </div>

        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>{loadingMessage}</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="error-display">
            <h3>An Error Occurred</h3>
            <p>{error}</p>
          </div>
        )}

        <div className={`tabs-wrapper ${isLoading || (error && !isLoading) ? 'hidden' : ''}`}>
          <Tabs selectedIndex={activeTabIndex} onSelect={index => setActiveTabIndex(index)} forceRenderTabPanel>
            <TabList>
              <Tab>Spec</Tab>
              <Tab disabled={!spec}>Code</Tab>
              <Tab disabled={!code}>Render</Tab>
              {requestedMaterials.lessonPlan && <Tab disabled={!lessonPlan}>Lesson Plan</Tab>}
              {requestedMaterials.handout && <Tab disabled={!handout}>Student Handout</Tab>}
              {requestedMaterials.quiz && <Tab disabled={!quiz}>Review Quiz</Tab>}
            </TabList>

            <TabPanel>
              <div className="tab-content spec-tab">
                {isEditingSpec ? (
                  <>
                    <div className="tab-actions">
                      <button onClick={handleSpecSave} className="button-primary">Save & Regenerate Code ({EDIT_SPEC_COST} Credits)</button>
                      <button onClick={handleSpecCancel} className="button-secondary">Cancel {countdown !== null && `(${countdown}s)`}</button>
                    </div>
                    <Editor
                      height="calc(100% - 40px)"
                      language="markdown"
                      value={editedSpec}
                      onChange={(v) => setEditedSpec(v || '')}
                      options={{ wordWrap: 'on', minimap: { enabled: false } }}
                    />
                  </>
                ) : (
                  <>
                    <div className="tab-actions">
                      {spec && <button onClick={handleSpecEdit} className="button-secondary">Edit Spec ({EDIT_SPEC_COST} Credits)</button>}
                    </div>
                    <pre className="spec-display">{spec || 'App specification will appear here...'}</pre>
                     {groundingChunks && groundingChunks.length > 0 && (
                      <div className="grounding-chunks">
                          <h4>Sources used to generate spec:</h4>
                          <ul>
                          {groundingChunks.map((chunk, index) => (
                              (chunk.web && chunk.web.uri) &&
                              <li key={index}>
                                  <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer">
                                      {chunk.web.title || chunk.web.uri}
                                  </a>
                              </li>
                          ))}
                          </ul>
                      </div>
                     )}
                  </>
                )}
              </div>
            </TabPanel>
            <TabPanel>
               <div className="tab-content">
                {saveMessage && <div className="save-message">{saveMessage}</div>}
                <Editor
                  height={saveMessage ? "calc(100% - 20px)" : "100%"}
                  language="html"
                  value={code}
                  onChange={handleCodeChange}
                  options={{ minimap: { enabled: false } }}
                />
               </div>
            </TabPanel>
            <TabPanel>
               <div className="tab-content render-tab">
                 <iframe
                    key={iframeKey}
                    srcDoc={code}
                    className="render-iframe"
                    title="Rendered App"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                  />
               </div>
            </TabPanel>
            {requestedMaterials.lessonPlan && (
              <TabPanel>
                <div className="tab-content material-tab">
                  <div className="tab-actions">
                     {lessonPlan && <button onClick={() => handlePrint(lessonPlan, 'Lesson Plan')} className="button-secondary">Print</button>}
                  </div>
                  <pre className="material-display">{lessonPlan || 'Generating lesson plan...'}</pre>
                </div>
              </TabPanel>
            )}
            {requestedMaterials.handout && (
              <TabPanel>
                <div className="tab-content material-tab">
                   <div className="tab-actions">
                     {handout && <button onClick={() => handlePrint(handout, 'Student Handout')} className="button-secondary">Print</button>}
                  </div>
                  <pre className="material-display">{handout || 'Generating handout...'}</pre>
                </div>
              </TabPanel>
            )}
            {requestedMaterials.quiz && (
              <TabPanel>
                <div className="tab-content material-tab">
                   <div className="tab-actions">
                      {quiz && !(quiz.error) && <button onClick={() => handlePrint(quiz, 'Review Quiz')} className="button-secondary">Print</button>}
                   </div>
                   <div className="material-display quiz-display-panel">{renderQuiz(quiz)}</div>
                </div>
              </TabPanel>
            )}
          </Tabs>
        </div>
      </div>

      {showRefineBar && (
        <div className="refinement-bar">
          <textarea
            value={refinementText}
            onChange={handleRefinementTextChange}
            onKeyDown={handleRefinementKeyDown}
            placeholder="Refine the app spec... (e.g., 'Add a score counter', 'Change the color scheme to blue'). Press Enter to submit."
            rows={2}
            disabled={isLoading}
            aria-label="Refine app specification"
          />
          <button
            onClick={() => handleRefineSubmit(refinementText)}
            disabled={isLoading || !refinementText.trim()}
            className="button-primary"
          >
            Refine ({EDIT_SPEC_COST} Credits)
          </button>
        </div>
      )}
      
      {showEmbedModal && <EmbedCodeModal isOpen={showEmbedModal} onClose={() => setShowEmbedModal(false)} appCode={code} />}
      {showDeployModal && <DeployModal isOpen={showDeployModal} onClose={() => setShowDeployModal(false)} appCode={code} />}
    </>
  );
});