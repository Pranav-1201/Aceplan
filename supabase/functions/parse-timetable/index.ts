import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, additionalContext, existingSubjects } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image provided');
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    console.log('Parsing timetable image with AI...');
    
    // Build the prompt with optional additional context and existing subjects
    let userPrompt = 'Please analyze this timetable image and extract ALL periods visible in the image. For each period, provide: subject name, day_of_week (0=Sunday, 1=Monday, etc.), start_time (HH:MM format), end_time (HH:MM format), location (if visible), and teacher (if visible). Return as JSON array with format: [{"subject": "...", "day_of_week": 1, "start_time": "09:00", "end_time": "10:00", "location": "...", "teacher": "..."}]. If you cannot determine a field, omit it or use null.';
    
    if (existingSubjects && existingSubjects.length > 0) {
      userPrompt += `\n\nIMPORTANT: The user already has these subjects in their system: ${existingSubjects.map((s: any) => s.name).join(', ')}. When you see subject names or abbreviations in the timetable, try to match them to these existing subjects. For example:
- "CN" could be "Computer Networks"
- "SE" could be "Software Engineering" 
- "AISC" could be "Artificial Intelligence and Soft Computing"
- "Predictive Analytics" and "Predictive Analysis" are the same subject
Use the EXACT subject name from this list when there's a clear match. Only create a new subject name if it doesn't match any existing subject.`;
      console.log('Using existing subjects:', existingSubjects.map((s: any) => s.name).join(', '));
    }
    
    if (additionalContext) {
      userPrompt += `\n\nAdditional context about this timetable: ${additionalContext}`;
      console.log('Using additional context:', additionalContext);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing timetable images. Extract ALL class periods with their subject names, days of week, start times, end times, locations (if visible), and teachers (if visible). Be thorough and capture every single period visible in the timetable. Pay special attention to abbreviations and match them with full subject names when provided. Pay attention to any additional context provided by the user about time formats, special notations, or conventions used in the timetable. Return the data as a JSON array with ALL periods found.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Try to extract JSON from the response
    let periods = [];
    try {
      // Look for JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        periods = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response
        periods = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Could not parse timetable. Please ensure the image is clear and contains a visible timetable.',
          rawResponse: aiResponse 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted periods:', periods);

    return new Response(
      JSON.stringify({ periods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-timetable function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
