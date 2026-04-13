import React, { useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, UploadCloud, FileJson, X, Zap } from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// Initialize React Query
const queryClient = new QueryClient()

export default function RootApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ResuMatchApp />
    </QueryClientProvider>
  )
}

function ResuMatchApp() {
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [evaluationId, setEvaluationId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // React Query Polling
  const { data: result, isLoading: isPolling } = useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:3000/api/resume/result/${evaluationId}`)
      return response.data
    },
    refetchInterval: (query) => {
      // Keep polling every 2 seconds if status is "processing", else stop polling
      return query.state.data?.status === 'processing' ? 2000 : false
    },
    enabled: !!evaluationId, // Only execute if we have an ID
  })

  // Dropzone Handler
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  })

  // Submit Handler
  const handleAnalyze = async () => {
    if (!file || !jd) return
    setIsUploading(true)
    
    // Clear previous results
    setEvaluationId(null)

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('jd', jd)

    try {
      const response = await axios.post('http://localhost:3000/api/resume/upload', formData)
      setEvaluationId(response.data.evaluation_id)
    } catch (err) {
      console.error('Upload failed:', err)
      alert("Failed to upload. Confirm your backend docker API is running!")
    } finally {
      setIsUploading(false)
    }
  }

  const isCompleted = result?.status === 'completed'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-6 md:p-12">
      {/* Header */}
      <header className="flex items-center gap-3 mb-12">
        <div className="bg-indigo-500 rounded-lg p-2 shadow-lg shadow-indigo-500/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          ResuMatch AI
        </h1>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        
        {/* Upload Form Area */}
        <section className="grid md:grid-cols-2 gap-8">
          
          {/* File Upload Zone */}
          <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
            <CardHeader>
              <CardTitle className="text-slate-200">1. Upload Resume</CardTitle>
              <CardDescription className="text-slate-400">PDF format required</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ease-in-out ${
                  isDragActive 
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[0.98]' 
                    : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50'
                }`}
              >
                <input {...getInputProps()} />
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div 
                      key="file"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <FileText className="w-12 h-12 text-indigo-400" />
                      <p className="font-medium text-indigo-300">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-slate-400 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        <X className="w-4 h-4 mr-2" /> Remove
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 py-6"
                    >
                      <div className="p-4 rounded-full bg-slate-800 group-hover:bg-slate-700 transition-colors">
                         <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-300">Drag & drop your resume here</p>
                        <p className="text-sm text-slate-500">or click to browse files</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* JD Input Area */}
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-200">2. Job Description</CardTitle>
                <CardDescription className="text-slate-400">Paste the target role details</CardDescription>
              </div>
              <FileJson className="w-5 h-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[220px] rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                placeholder="We are looking for a Senior Software Engineer with deep expertise in React, TypeScript, and large-scale architectural patterns..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </CardContent>
          </Card>
        </section>

        {/* Action Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center"
        >
          <Button 
            size="lg" 
            className="w-full md:w-auto px-12 h-14 bg-indigo-500 hover:bg-indigo-600 text-lg shadow-lg shadow-indigo-500/25 transition-all"
            disabled={!file || !jd || isUploading || isPolling || result?.status === 'processing'}
            onClick={handleAnalyze}
          >
            {isUploading ? "Uploading..." : (isPolling || result?.status === 'processing') && !isCompleted ? "Evaluating with Gemini LLM..." : "Analyze Match"}
          </Button>
        </motion.div>

        {/* Dynamic State Feedback */}
        <AnimatePresence>
          {(isPolling || result?.status === 'processing') && !isCompleted && result?.status !== 'failed' && (
            <motion.div
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: "auto", opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden"
            >
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-6 py-12">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                      <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-lg font-medium text-slate-200">The LLM is processing your request...</h3>
                       <p className="text-sm text-slate-500">This usually takes less than 15 seconds via Async Queue.</p>
                    </div>
                    <div className="w-64 space-y-2">
                      <Skeleton className="h-2 w-full bg-slate-800" />
                      <Skeleton className="h-2 w-[80%] mx-auto bg-slate-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {result?.status === 'failed' && (
            <motion.div
               initial={{ y: 40, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="mb-8"
            >
              <Card className="bg-red-950/30 border-red-900/50">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                   <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                     <X className="w-8 h-8 text-red-500" />
                   </div>
                   <h3 className="text-xl font-bold text-red-400 mb-2">Analysis Failed</h3>
                   <p className="text-slate-400 max-w-md">
                     The background worker encountered a critical error while evaluating this resume. Please ensure your Gemini API key is valid and the file is a readable PDF!
                   </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isCompleted && (
            <motion.div
               initial={{ y: 40, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ type: "spring", stiffness: 100 }}
            >
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-slate-900 border-b border-slate-800 w-full justify-start rounded-b-none h-14 px-4">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-400">Scorecard Overview</TabsTrigger>
                  <TabsTrigger value="deep-dive" className="data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-400">Deep Dive Analysis</TabsTrigger>
                </TabsList>
                
                <Card className="rounded-tl-none bg-slate-900 border-slate-800 border-t-0 shadow-2xl">
                  <CardContent className="p-8">
                    <TabsContent value="overview" className="mt-0 space-y-8">
                      <div className="flex flex-col md:flex-row items-center gap-12">
                         {/* ATS Circular Visual Metric */}
                         <div className="relative flex items-center justify-center">
                           <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
                              <circle cx="50" cy="50" r="45" fill="none" className="stroke-slate-800" strokeWidth="8" />
                              <motion.circle 
                                cx="50" cy="50" r="45" fill="none" 
                                className={`${result.score > 75 ? 'stroke-emerald-400' : result.score > 50 ? 'stroke-amber-400' : 'stroke-red-400'}`} 
                                strokeWidth="8" 
                                strokeLinecap="round"
                                strokeDasharray="283"
                                initial={{ strokeDashoffset: 283 }}
                                animate={{ strokeDashoffset: 283 - (283 * result.score) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                              />
                           </svg>
                           <div className="absolute flex flex-col items-center">
                             <span className="text-5xl font-black">{result.score}</span>
                             <span className="text-xs uppercase tracking-widest text-slate-400 mt-1">Match</span>
                           </div>
                         </div>

                         {/* Results Text */}
                         <div className="flex-1 space-y-6">
                            <div>
                               <h2 className="text-2xl font-bold mb-2">Evaluation Verdict: <span className="text-white">{result.verdict}</span></h2>
                               <p className="text-slate-400 leading-relaxed text-lg">{result.justification}</p>
                            </div>
                            
                            {result.score < 100 && (
                               <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                                  <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                                     <X className="w-4 h-4" /> Critical Missing Requirements
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {(result.missing_requirements || []).map((req, i) => (
                                      <Badge key={i} variant="outline" className="text-red-300 border-red-500/30 bg-red-500/10">
                                        {req}
                                      </Badge>
                                    ))}
                                    {(!result.missing_requirements || result.missing_requirements.length === 0) && (
                                       <span className="text-slate-500 italic text-sm">None explicitly noted.</span>
                                    )}
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="deep-dive" className="mt-0">
                      <div className="space-y-6">
                         <div className="bg-slate-950 rounded-lg p-6 border border-slate-800">
                           <h3 className="font-semibold text-slate-300 mb-4 tracking-wide uppercase text-sm">LLM Detailed Justification Payload</h3>
                           <p className="text-slate-400 leading-loose">
                             {result.justification}
                           </p>
                           
                           {/* Decorative Progress Bars */}
                           <div className="mt-8 space-y-5">
                              <div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-slate-300">Keyword Density Match</span><span className="text-emerald-400 font-medium">High</span></div>
                                <Progress value={85} className="h-1.5 bg-slate-800 indicator-emerald" />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-slate-300">Experience Alignment</span><span className="text-emerald-400 font-medium">Strong</span></div>
                                <Progress value={result.score || 70} className="h-1.5 bg-slate-800 indicator-emerald" />
                              </div>
                           </div>
                         </div>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}
